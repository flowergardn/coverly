import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import ky from "ky";
import { env } from "~/env";
import {
  db,
  dailySong,
  artists as artistSchema,
  tracks as trackSchema,
} from "@coverly/db";
import { getBaseURL, getDailySongIndex } from "~/lib/utils";
import { generatePreviewUrl } from "./generate-preview";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const artistName = searchParams.get("artist");
  const includeAnswer = searchParams.get("includeAnswer") === "true";
  const adminKey = searchParams.get("adminKey");

  if (!artistName) {
    return NextResponse.json(
      { error: "Missing artist parameter" },
      { status: 400 },
    );
  }

  try {
    const decodedName = decodeURIComponent(artistName).toLowerCase();
    const today = new Date().toISOString().split("T")[0];

    if (!today) {
      return NextResponse.json(
        { error: "Could not determine current date" },
        { status: 500 },
      );
    }

    // ensures the artist data exists (this will fetch & cache it if needed)
    const setupResponse = await ky
      .get(`${getBaseURL()}/api/setup-artist`, {
        searchParams: { artist: decodedName },
        timeout: 30_000,
      })
      .json<{ artist: { spotify_id: string; name: string } }>();

    const artist = await db.query.artists.findFirst({
      where: eq(artistSchema.spotify_id, setupResponse.artist.spotify_id),
    });

    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    const tracks = await db.query.tracks.findMany({
      where: and(
        eq(trackSchema.artist_id, artist.spotify_id),
        eq(trackSchema.playable, true),
      ),
      orderBy: trackSchema.spotify_id,
    });

    if (tracks.length === 0) {
      return NextResponse.json(
        { error: "No tracks found for this artist" },
        { status: 404 },
      );
    }

    console.log(
      `Fetching manual song where song.date = ${today} AND song.artist = ${artist.name}`,
    );

    const [manualSong] = await db
      .select()
      .from(dailySong)
      .where(and(eq(dailySong.date, today), eq(dailySong.artist, artist.name)));

    let todayTrack;
    let isManuallySet = false;

    if (manualSong) {
      todayTrack = tracks.find(
        (track) => track.spotify_id === manualSong.song_id,
      );
      isManuallySet = true;
    } else {
      const dailyIndex = getDailySongIndex(artist.name, tracks.length);
      todayTrack = tracks[dailyIndex];
    }

    if (!todayTrack) {
      return NextResponse.json(
        { error: "Could not determine today's track" },
        { status: 500 },
      );
    }

    const previewUrlPromise = generatePreviewUrl(artist, todayTrack);

    const cropSizes = [30, 50, 80, 120, 256, 512];
    const croppedImageUrls = cropSizes.map(
      (size, index) =>
        `/api/crop?${new URLSearchParams({
          id: todayTrack.album_cover_url.replace(
            "https://i.scdn.co/image/",
            "",
          ),
          artist: artist.name,
          size: size.toString(),
          hint: index.toString(),
        })}`,
    );

    const baseResponse = {
      date: today,
      artist: {
        name: artist.name,
        spotify_id: artist.spotify_id,
      },
      totalTracks: tracks.length,
      isManuallySet,
      hints: {
        croppedImageUrls,
        maxHints: cropSizes.length - 1,
      },
    };

    let preview_url: string | null = null;
    try {
      preview_url = await previewUrlPromise;
    } catch (error) {
      console.error("Preview URL generation failed:", error);
    }

    if (includeAnswer && adminKey === env.ADMIN_KEY) {
      return NextResponse.json({
        ...baseResponse,
        track: {
          name: todayTrack.name,
          spotify_id: todayTrack.spotify_id,
          album_cover_url: todayTrack.album_cover_url,
          preview_url,
        },
        allTracks: tracks.map((track) => track.name),
      });
    }

    return NextResponse.json({
      ...baseResponse,
      preview_url,
    });
  } catch (error) {
    console.error("Error fetching daily song:", error);
    return NextResponse.json(
      { error: "Failed to fetch daily song" },
      { status: 500 },
    );
  }
}
