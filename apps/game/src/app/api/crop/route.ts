import { type NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageId = searchParams.get("id");
  const artist = searchParams.get("artist");
  const cropSize = parseInt(searchParams.get("size") ?? "150");
  const hintLevel = parseInt(searchParams.get("hint") ?? "0");

  if (!imageId || !artist) {
    return new NextResponse("Missing parameters", { status: 400 });
  }

  try {
    const response = await fetch(`https://i.scdn.co/image/${imageId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const imageBuffer = await response.arrayBuffer();

    const today = new Date().toISOString().split("T")[0];
    const seed = `${today}-${artist}-hint${hintLevel}`;

    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    const image = sharp(Buffer.from(imageBuffer));
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error("Could not get image dimensions");
    }

    // ensures we don't try to crop past image boundaries
    const maxX = Math.max(0, metadata.width - cropSize);
    const maxY = Math.max(0, metadata.height - cropSize);

    const cropX = Math.abs(hash) % (maxX + 1);
    const cropY = Math.abs(hash >> 16) % (maxY + 1);

    // for higher hint levels, we bias towards center
    // this makes the hints more likely to be actually useful
    const centerBias = hintLevel * 0.2;
    const centerX = metadata.width / 2 - cropSize / 2;
    const centerY = metadata.height / 2 - cropSize / 2;

    const biasedX = Math.round(cropX * (1 - centerBias) + centerX * centerBias);
    const biasedY = Math.round(cropY * (1 - centerBias) + centerY * centerBias);

    const finalX = Math.max(0, Math.min(biasedX, maxX));
    const finalY = Math.max(0, Math.min(biasedY, maxY));

    const croppedImage = await image
      .extract({
        left: finalX,
        top: finalY,
        width: Math.min(cropSize, metadata.width - finalX),
        height: Math.min(cropSize, metadata.height - finalY),
      })
      .resize(cropSize, cropSize, {
        kernel: sharp.kernel.lanczos3,
        fit: "fill",
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    return new NextResponse(croppedImage, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400",
        "CDN-Cache-Control": "public, max-age=86400",
        Vary: "hint",
      },
    });
  } catch (error) {
    console.error("Error cropping image:", error);
    return new NextResponse(
      `Error processing image: ${error instanceof Error ? error.message : "Unknown error"}`,
      {
        status: 500,
      },
    );
  }
}
