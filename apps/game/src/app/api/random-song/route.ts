import { eq, and, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDailySongIndex } from "~/lib/utils";
import {
  db,
  dailySong,
  artists as artistSchema,
  tracks as trackSchema,
} from "@coverly/db";

export async function GET() {
  try {
    const [randomArtistId] = await db
      .select({
        spotify_id: artistSchema.spotify_id,
      })
      .from(artistSchema)
      .innerJoin(
        trackSchema,
        eq(trackSchema.artist_id, artistSchema.spotify_id),
      )
      .where(eq(trackSchema.playable, true))
      .groupBy(artistSchema.spotify_id)
      .orderBy(sql`RANDOM()`)
      .limit(1);

    if (!randomArtistId) {
      return NextResponse.json(
        { error: "No artists with playable tracks found" },
        { status: 404 },
      );
    }

    const artist = await db.query.artists.findFirst({
      where: eq(artistSchema.spotify_id, randomArtistId.spotify_id),
    });

    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }
    const today = new Date().toISOString().split("T")[0];

    const tracks = await db.query.tracks.findMany({
      where: and(
        eq(trackSchema.artist_id, artist.spotify_id),
        eq(trackSchema.playable, true),
      ),
      orderBy: trackSchema.spotify_id,
    });

    if (tracks.length === 0) {
      return NextResponse.json(
        { error: "No playable tracks found for selected artist" },
        { status: 404 },
      );
    }

    const [manualSong] = await db
      .select()
      .from(dailySong)
      .where(
        and(eq(dailySong.date, today ?? ""), eq(dailySong.artist, artist.name)),
      );

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
        { error: "Could not determine today's track for selected artist" },
        { status: 500 },
      );
    }

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

    return NextResponse.json(baseResponse);
  } catch (error) {
    console.error("Error fetching random song:", error);
    return NextResponse.json(
      { error: "Failed to fetch random song" },
      { status: 500 },
    );
  }
}
