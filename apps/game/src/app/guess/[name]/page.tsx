import ky from "ky";
import { env } from "~/env";
import { GameClient } from "./game-client";
import { cookies } from "next/headers";
import { getBaseURL } from "~/lib/utils";
import type { Metadata } from "next";
import type { DailySongResponse } from "~/types/General";

interface PageProps {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  try {
    const ogImageParams = new URLSearchParams({
      artist: decodedName,
    });

    const ogImageUrl = `${getBaseURL()}/api/og?${ogImageParams.toString()}`;
    const title = `Can you guess ${decodedName}'s song? - Coverly`;
    const description = `Test your music knowledge! Can you identify ${decodedName}'s song from tiny pieces of album cover art?`;

    return {
      title,
      description,

      openGraph: {
        title,
        description,
        type: "website",
        url: `https://coverly.astrid.sh/${encodeURIComponent(name)}`,
        siteName: "Coverly",
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: `Coverly challenge for ${decodedName}`,
            type: "image/png",
          },
        ],
        locale: "en_US",
      },

      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImageUrl],
        creator: "@maybeastrid",
        site: "@maybeastrid",
      },

      keywords: [
        "music game",
        "album cover game",
        decodedName,
        `${decodedName} songs`,
        "song guessing game",
        "music trivia",
        "cover art quiz",
        "daily music challenge",
      ],
    };
  } catch (error) {
    console.error("Error generating metadata:", error);

    return {
      title: `${decodedName} - Coverly Music Game`,
      description: `Test your knowledge of ${decodedName}'s music! Guess songs from album cover art pieces.`,

      openGraph: {
        title: `${decodedName} - Coverly Music Game`,
        description: `Can you guess ${decodedName}'s songs from tiny pieces of album covers?`,
        type: "website",
        url: `https://coverly.astrid.sh/${encodeURIComponent(name)}`,
        siteName: "Coverly",
        images: [
          {
            url: "/og-image.png",
            width: 1200,
            height: 630,
            alt: "Coverly - Music Game",
            type: "image/png",
          },
        ],
      },
    };
  }
}

export default async function GuessSong({ params }: PageProps) {
  const { name } = await params;
  const cookieJar = await cookies();

  const decodedName = decodeURIComponent(name).toLowerCase();

  try {
    // this is using the endpoint on the server side
    // in order to get the correct song & list of
    // songs for the dropdown inside the game
    const dailySongData = await ky
      .get(`${getBaseURL()}/api/daily-song`, {
        searchParams: {
          artist: decodedName,
          includeAnswer: "true",
          adminKey: env.ADMIN_KEY,
        },
      })
      .json<DailySongResponse>();

    if (!dailySongData.track || !dailySongData.allTracks) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-black p-4">
          <div className="text-center text-white">
            <h2 className="mb-4 text-3xl font-bold">
              No tracks found for {name}
            </h2>
            <p className="text-lg text-gray-400">
              Please try a different artist.
            </p>
          </div>
        </div>
      );
    }

    const todayTrack = dailySongData.track;
    const previouslyWon =
      cookieJar.get("last_won_game_" + decodedName)?.value === todayTrack.name;

    console.log(todayTrack);

    return (
      <div className="min-h-screen bg-black">
        <div className="container mx-auto px-4 py-8">
          <GameClient
            wonGame={previouslyWon}
            artistName={decodedName}
            fullCoverUrl={todayTrack.album_cover_url}
            previewUrl={todayTrack.preview_url}
            croppedImageUrls={dailySongData.hints.croppedImageUrls}
            correctSongName={todayTrack.name}
            allSongs={dailySongData.allTracks}
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error loading artist data:", error);
    return (
      <div className="flex min-h-screen items-center justify-center bg-black p-4">
        <div className="text-center text-white">
          <h2 className="mb-4 text-3xl font-bold">Error loading game</h2>
          <p className="text-lg text-gray-400">
            Unable to load tracks for {name}. Please try again later.
          </p>
        </div>
      </div>
    );
  }
}
