import ky from "ky";
import * as m3u8stream from "m3u8stream";

const API_BASE_URL = "https://api-v2.soundcloud.com";
const DEFAULT_HIGH_WATER_MARK = 16 * 1024;

interface DownloadOptions {
  highWaterMark?: number;
}

interface Track {
  media: {
    transcodings: Array<{
      url: string;
      preset: string;
      duration: number;
      snipped: boolean;
      format: {
        protocol: string;
        mime_type: string;
      };
      quality: string;
    }>;
  };
}

interface M3U8Response {
  url: string;
}

export const getSingleItemInfo = async (
  clientId: string,
  url: string,
): Promise<Track> => {
  try {
    return await ky
      .get(`${API_BASE_URL}/resolve`, {
        searchParams: {
          url,
          client_id: clientId,
        },
      })
      .json<Track>();
  } catch (error) {
    throw new Error("Invalid URL or failed to fetch track info");
  }
};

export const getTrack = async (clientId: string, url: string): Promise<Track> =>
  getSingleItemInfo(clientId, url);

const getTrackStream = (
  url: string,
  downloadOptions?: DownloadOptions,
): m3u8stream.Stream => {
  try {
    return m3u8stream.default(url, {
      highWaterMark: downloadOptions?.highWaterMark ?? DEFAULT_HIGH_WATER_MARK,
    });
  } catch (error) {
    throw new Error("Invalid URL for track stream");
  }
};

const getM3u8Url = async (clientId: string, url: string): Promise<string> => {
  try {
    const response = await ky
      .get(url, {
        searchParams: {
          client_id: clientId,
        },
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
          Accept: "*/*",
          "Accept-Encoding": "gzip, deflate, br",
        },
      })
      .json<M3U8Response>();

    if (!response.url) throw new Error("No URL found in response");
    return response.url;
  } catch (error) {
    throw new Error("Failed to fetch M3U8 URL");
  }
};

export const download = async (
  clientId: string,
  url: string,
  downloadOptions?: DownloadOptions,
): Promise<m3u8stream.Stream> => {
  const track = await getTrack(clientId, url);

  const transcoding = track.media.transcodings.find(
    (t) => t.format.protocol === "hls",
  );

  if (!transcoding) throw new Error("No HLS transcoding found for this track");

  const m3u8Url = await getM3u8Url(clientId, transcoding.url);
  return getTrackStream(m3u8Url, downloadOptions);
};
