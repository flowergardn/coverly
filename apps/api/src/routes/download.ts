import * as fs from "fs";
import { spawn } from "child_process";
import { download } from "../utils/soundcloud";
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import Elysia, { status, t } from "elysia";
import { env } from "~/env";
import { nanoid } from "nanoid";
import {
  register,
  collectDefaultMetrics,
  Histogram,
  Gauge,
  Counter,
} from "prom-client";

collectDefaultMetrics({ prefix: "soundcloud_api_" });

const processingDuration = new Histogram({
  name: "audio_processing_duration_seconds",
  help: "Time spent processing audio files",
  labelNames: ["operation"],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
});

const memoryUsage = new Gauge({
  name: "process_memory_detailed_bytes",
  help: "Detailed memory usage breakdown",
  labelNames: ["type"],
});

const activeRequests = new Gauge({
  name: "active_audio_requests",
  help: "Number of currently active audio processing requests",
});

const requestsTotal = new Counter({
  name: "audio_requests_total",
  help: "Total number of audio processing requests",
  labelNames: ["status", "cached"],
});

const fileSizes = new Histogram({
  name: "audio_file_size_bytes",
  help: "Size of audio files processed",
  labelNames: ["type"], // downloaded, clipped
  buckets: [1024, 10240, 102400, 1048576, 10485760, 52428800], // 1KB to 50MB
});

function updateMemoryMetrics() {
  const usage = process.memoryUsage();
  memoryUsage.labels("rss").set(usage.rss);
  memoryUsage.labels("heapUsed").set(usage.heapUsed);
  memoryUsage.labels("heapTotal").set(usage.heapTotal);
  memoryUsage.labels("external").set(usage.external);
  memoryUsage.labels("arrayBuffers").set(usage.arrayBuffers);
}

setInterval(updateMemoryMetrics, 5000);

const s3Client = new S3Client({
  region: "auto",
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

function getAudioDuration(inputFile: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const timer = processingDuration.labels("get_duration").startTimer();

    const ffprobe = spawn("ffprobe", [
      "-v",
      "quiet",
      "-show_entries",
      "format=duration",
      "-of",
      "csv=p=0",
      inputFile,
    ]);

    let output = "";
    ffprobe.stdout.on("data", (data) => {
      output += data.toString();
    });

    ffprobe.on("close", (code) => {
      timer();
      if (code === 0) {
        const duration = parseFloat(output.trim());
        resolve(isNaN(duration) ? 0 : duration);
      } else {
        reject(new Error(`ffprobe failed with code ${code}`));
      }
    });
  });
}

function clipAudio(
  inputFile: string,
  outputFile: string,
  clipDuration: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = processingDuration.labels("clip_audio").startTimer();

    const ffmpeg = spawn("ffmpeg", [
      "-i",
      inputFile,
      "-ss",
      "0",
      "-t",
      clipDuration.toString(),
      "-c:a",
      "libmp3lame",
      "-b:a",
      "128k",
      "-avoid_negative_ts",
      "make_zero",
      "-y",
      outputFile,
    ]);

    let stderr = "";
    ffmpeg.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ffmpeg.on("close", (code) => {
      timer();
      if (code === 0) {
        console.log(`Created clip: ${outputFile}`);

        // records clipped file size for metrics
        try {
          const stats = fs.statSync(outputFile);
          fileSizes.labels("clipped").observe(stats.size);
        } catch (e) {
          console.warn("Could not measure clipped file size:", e);
        }

        resolve();
      } else {
        console.error(`FFmpeg error: ${stderr}`);
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });

    ffmpeg.on("error", (error) => {
      timer();
      reject(new Error(`FFmpeg spawn error: ${error.message}`));
    });
  });
}

function downloadAudio(
  stream: NodeJS.ReadableStream,
  outputPath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = processingDuration.labels("download_audio").startTimer();
    const writeStream = fs.createWriteStream(outputPath);

    stream.pipe(writeStream);

    writeStream.on("finish", () => {
      timer();
      console.log(`Audio downloaded successfully: ${outputPath}`);

      // records downloaded file size for metrics
      try {
        const stats = fs.statSync(outputPath);
        fileSizes.labels("downloaded").observe(stats.size);
      } catch (e) {
        console.warn("Could not measure downloaded file size:", e);
      }

      setTimeout(() => resolve(), 100);
    });

    writeStream.on("error", (error) => {
      timer();
      reject(error);
    });

    stream.on("error", (error) => {
      timer();
      reject(error);
    });
  });
}

async function upload(bucketName: string, key: string, filePath: string) {
  const timer = processingDuration.labels("upload_s3").startTimer();

  try {
    const buffer = fs.readFileSync(filePath);

    if (buffer.length === 0) {
      throw new Error(`File buffer is empty: ${filePath}`);
    }

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: "audio/mpeg",
    });

    await s3Client.send(command);
    timer();
    return `${env.R2_ENDPOINT}/${key}`;
  } catch (error) {
    timer();
    throw error;
  }
}

async function checkObjectExists(
  bucketName: string,
  key: string,
): Promise<boolean> {
  const timer = processingDuration.labels("check_s3_exists").startTimer();

  try {
    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await s3Client.send(command);
    timer();
    return true;
  } catch (error: any) {
    timer();
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

const router = new Elysia()
  .get("/metrics", async () => {
    return new Response(await register.metrics(), {
      headers: { "Content-Type": register.contentType },
    });
  })
  .post(
    "/",
    async ({ query, body }) => {
      // tracks active requests
      activeRequests.inc();
      const requestTimer = processingDuration
        .labels("total_request")
        .startTimer();

      try {
        if (!query.clientId) {
          requestsTotal.labels("error", "false").inc();
          return status(400, { error: "No client ID provided" });
        }
        if (!body.url) {
          requestsTotal.labels("error", "false").inc();
          return status(400, { error: "No URL provided" });
        }

        const bucketName = env.R2_BUCKET_NAME;
        const r2Key = `${nanoid(12)}.mp3`;

        console.log(`processing new clip...`);

        const tempAudioFile = `temp_${Date.now()}.mp3`;
        const outputFile = `output_${Date.now()}.mp3`;

        console.log("updating memory");

        // ppdate memory before intensive operations
        updateMemoryMetrics();

        console.log("getting stream");
        const stream = await download(query.clientId, body.url);
        console.log("downloading audio");
        await downloadAudio(stream, tempAudioFile);

        console.log("Verifying downloaded file...");
        if (!fs.existsSync(tempAudioFile)) {
          throw new Error("Downloaded file does not exist");
        }

        const downloadedStats = fs.statSync(tempAudioFile);
        console.log(`Downloaded file size: ${downloadedStats.size} bytes`);

        if (downloadedStats.size === 0) {
          throw new Error("Downloaded file is empty");
        }

        // update memory before ffmpeg operations
        updateMemoryMetrics();

        const actualDuration = await getAudioDuration(tempAudioFile);
        const effectiveDuration = Math.min(15, actualDuration);

        await clipAudio(tempAudioFile, outputFile, effectiveDuration);

        console.log("Verifying clipped file...");
        if (!fs.existsSync(outputFile)) {
          throw new Error("Clipped file does not exist");
        }

        const clippedStats = fs.statSync(outputFile);
        console.log(`Clipped file size: ${clippedStats.size} bytes`);

        if (clippedStats.size === 0) {
          throw new Error("Clipped file is empty");
        }

        fs.unlinkSync(tempAudioFile);

        console.log(`Uploading to R2: ${r2Key}`);
        const publicUrl = await upload(bucketName, r2Key, outputFile);

        fs.unlinkSync(outputFile);
        updateMemoryMetrics();

        // note: "false" here means its cached state
        requestsTotal.labels("success", "false").inc();
        return {
          success: true,
          message: "Created and uploaded new clip",
          cached: false,
          clip: {
            r2Key,
            url: publicUrl,
          },
        };
      } catch (error) {
        console.error("Error processing download:", error);
        requestsTotal.labels("error", "false").inc();
        return status(500, {
          error: "Failed to process download",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        activeRequests.dec();
        requestTimer();
        updateMemoryMetrics();
      }
    },
    {
      body: t.Object({
        url: t.String(),
      }),
      query: t.Object({
        clientId: t.String(),
      }),
    },
  );

export default router;
