import ky from "ky";
import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";
import { env } from "~/env";
import type { DailySongResponse } from "~/types/General";
import { getBaseURL } from "~/lib/utils";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artist = searchParams.get("artist");

    let dailySongData: DailySongResponse;
    let headerText: string;

    if (!artist) {
      dailySongData = await ky
        .get(`${getBaseURL()}/api/random-song`, {
          searchParams: {
            includeAnswer: "true",
            adminKey: env.ADMIN_KEY,
          },
        })
        .json<DailySongResponse>();

      headerText = "Guess the song from the cover art";
    } else {
      dailySongData = await ky
        .get(`${getBaseURL()}/api/daily-song`, {
          searchParams: {
            artist: artist,
            includeAnswer: "true",
            adminKey: env.ADMIN_KEY,
          },
        })
        .json<DailySongResponse>();

      headerText = `Guess the ${artist} song from the cover art`;
    }

    const cover = dailySongData
      ? `${getBaseURL()}${dailySongData.hints.croppedImageUrls[2]}`
      : "";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
          }}
        >
          <div tw="flex items-center justify-between w-full bg-gray-900 p-20">
            <div tw="flex flex-col items-start flex-1 pr-15">
              <div tw="flex items-center mb-15">
                <div tw="text-5xl mr-4">🎵</div>
                <h1 tw="text-6xl font-bold text-white tracking-tight">
                  Coverly
                </h1>
              </div>

              <h2 tw="text-5xl font-bold text-white mb-10 leading-tight tracking-tight">
                {headerText}
              </h2>
            </div>

            {cover && (
              <div tw="flex items-center justify-center w-96 h-96 rounded-xl shadow-xl shadow-purple-500/30">
                <img
                  src={cover}
                  style={{
                    filter: "blur(10px) brightness(0.8) contrast(1.2)",
                  }}
                />
              </div>
            )}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (e) {
    console.log(e);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
