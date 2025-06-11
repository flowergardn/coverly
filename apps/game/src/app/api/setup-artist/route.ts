import { and, eq } from "drizzle-orm";
import ky from "ky";
import { NextResponse } from "next/server";
import { env } from "~/env";
import {
  db,
  artists as artistSchema,
  tracks as trackSchema,
} from "@coverly/db";
import { getSpotifyAccessToken } from "~/server/spotify";
import type {
  SpotifyArtistResponse,
  SpotifyAlbumsResponse,
  SpotifyAlbum,
  SpotifyAlbumTracksResponse,
} from "~/types/Spotify";

export async function GET(request: Request) {
  console.log("🚀 API endpoint hit");
  const { searchParams } = new URL(request.url);
  const artistName = searchParams.get("artist");
  const mergeFromId = searchParams.get("mergeFromId");
  const featureTrackId = searchParams.get("featureTrackId");
  const adminKey = searchParams.get("adminKey");

  console.log("📝 Parameters:", {
    artistName,
    mergeFromId,
    featureTrackId,
    adminKey: adminKey ? "***" : null,
  });

  if (!artistName) {
    console.log("❌ Missing artist parameter");
    return NextResponse.json(
      { error: "Missing artist parameter" },
      { status: 400 },
    );
  }

  try {
    if (featureTrackId && adminKey === env.ADMIN_KEY) {
      console.log("🎵 Adding feature track");
      return await addFeatureTrack(artistName, featureTrackId);
    }

    if (mergeFromId && adminKey === env.ADMIN_KEY) {
      console.log("🔄 Merging artist songs");
      return await mergeArtistSongs(artistName, mergeFromId);
    }

    console.log("🔍 Getting artist tracks by name");
    return await getArtistTracksByName(artistName);
  } catch (error) {
    console.error("💥 Error in setup-artist API:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 },
    );
  }
}

async function mergeArtistSongs(
  targetArtistName: string,
  sourceArtistId: string,
) {
  console.log("🔄 Starting merge process for:", targetArtistName);
  const token = await getSpotifyAccessToken();
  if (!token) {
    console.log("❌ Failed to get Spotify token");
    return NextResponse.json(
      { error: "Failed to get Spotify access token" },
      { status: 500 },
    );
  }

  let targetArtist = await db.query.artists.findFirst({
    where: eq(artistSchema.name, targetArtistName.toLowerCase()),
  });

  if (!targetArtist) {
    console.log("🔍 Target artist not found in DB, searching Spotify");
    const targetSpotifyData = await searchSpotifyArtist(
      targetArtistName,
      token,
    );
    if (!targetSpotifyData) {
      console.log("❌ Target artist not found on Spotify");
      return NextResponse.json(
        { error: "Target artist not found on Spotify" },
        { status: 404 },
      );
    }

    const [insertedArtist] = await db
      .insert(artistSchema)
      .values({
        spotify_id: targetSpotifyData.id,
        name: targetSpotifyData.name.toLowerCase(),
      })
      .returning();
    targetArtist = insertedArtist;
    console.log("✅ Created target artist:", targetArtist?.name);
  }

  if (!targetArtist) {
    console.log("❌ Failed to create target artist");
    return NextResponse.json(
      { error: "Failed to create target artist" },
      { status: 500 },
    );
  }

  console.log("📡 Fetching source artist info from Spotify");
  const sourceArtistInfo = await ky
    .get(`https://api.spotify.com/v1/artists/${sourceArtistId}`, {
      headers: {
        Authorization: "Bearer " + token,
      },
    })
    .json<{
      id: string;
      name: string;
      followers: { total: number };
      genres: string[];
      images: Array<{ url: string; height: number; width: number }>;
      popularity: number;
    }>();

  console.log("🎵 Fetching source tracks");
  const sourceTracks = await fetchAndCacheArtistTracks(
    sourceArtistId,
    token,
    true,
  );

  const mergedTracksToInsert = sourceTracks.map((track) => ({
    spotify_id: track.spotify_id,
    artist_id: targetArtist.spotify_id,
    name: track.name,
    album_cover_url: track.album_cover_url,
  }));

  console.log(`💾 Inserting ${mergedTracksToInsert.length} merged tracks`);
  if (mergedTracksToInsert.length > 0) {
    await db
      .insert(trackSchema)
      .values(mergedTracksToInsert)
      .onConflictDoNothing({
        target: trackSchema.spotify_id,
      });
  }

  const allTargetTracks = await db.query.tracks.findMany({
    where: eq(trackSchema.artist_id, targetArtist.spotify_id),
  });

  console.log("✅ Merge complete");
  return NextResponse.json({
    artist: targetArtist,
    tracks: allTargetTracks,
    merged: true,
    mergedFrom: sourceArtistInfo.name,
    mergedCount: mergedTracksToInsert.length,
  });
}

async function getArtistTracksByName(artistName: string) {
  console.log("🔍 Searching for artist:", artistName);

  const cachedArtist = await db.query.artists.findFirst({
    where: eq(artistSchema.name, artistName.toLowerCase()),
  });

  if (cachedArtist) {
    console.log("✅ Found cached artist:", cachedArtist.name);
    const cachedTracks = await db.query.tracks.findMany({
      where: and(
        eq(trackSchema.artist_id, cachedArtist.spotify_id),
        eq(trackSchema.playable, true),
      ),
    });

    console.log(`📀 Found ${cachedTracks.length} cached tracks`);
    return NextResponse.json({
      artist: cachedArtist,
      tracks: cachedTracks,
    });
  }

  console.log("🔍 Artist not cached, getting Spotify token");
  const token = await getSpotifyAccessToken();
  if (!token) {
    console.log("❌ Failed to get Spotify token");
    return NextResponse.json(
      { error: "Failed to get Spotify access token" },
      { status: 500 },
    );
  }

  console.log("📡 Searching Spotify for artist");
  const artistData = await ky
    .get("https://api.spotify.com/v1/search", {
      searchParams: {
        q: `artist:${artistName}`,
        type: "artist",
        limit: "1",
      },
      headers: {
        Authorization: "Bearer " + token,
      },
    })
    .json<SpotifyArtistResponse>();

  const artist = artistData.artists.items[0];
  if (!artist) {
    console.log("❌ Artist not found on Spotify");
    return NextResponse.json({ error: "Artist not found" }, { status: 404 });
  }

  console.log("✅ Found artist on Spotify:", artist.name, "ID:", artist.id);

  let dbArtist = await db.query.artists.findFirst({
    where: eq(artistSchema.spotify_id, artist.id),
  });

  if (!dbArtist) {
    console.log("💾 Creating new artist in DB");
    const [insertedArtist] = await db
      .insert(artistSchema)
      .values({
        spotify_id: artist.id,
        name: artist.name.toLowerCase(),
      })
      .returning();

    if (!insertedArtist) {
      console.log("❌ Failed to create artist in DB");
      return NextResponse.json(
        { error: "Failed to create artist" },
        { status: 500 },
      );
    }

    dbArtist = insertedArtist;
    console.log("✅ Created artist in DB:", dbArtist.name);
  } else {
    console.log("✅ Artist already exists in DB:", dbArtist.name);
  }

  console.log("🎵 Fetching and caching artist tracks");
  const tracks = await fetchAndCacheArtistTracks(artist.id, token);

  console.log(`✅ Process complete. Found ${tracks.length} tracks`);
  return NextResponse.json({
    artist: dbArtist,
    tracks: tracks,
  });
}

async function searchSpotifyArtist(artistName: string, token: string) {
  console.log("🔍 Searching Spotify for artist:", artistName);
  const artistData = await ky
    .get("https://api.spotify.com/v1/search", {
      searchParams: {
        q: `artist:${artistName}`,
        type: "artist",
        limit: "1",
      },
      headers: {
        Authorization: "Bearer " + token,
      },
    })
    .json<SpotifyArtistResponse>();

  const result = artistData.artists.items[0] ?? null;
  console.log("🔍 Search result:", result ? result.name : "Not found");
  return result;
}

async function fetchAndCacheArtistTracks(
  artistId: string,
  token: string,
  fetchOnly?: boolean,
) {
  console.log("🎵 Fetching tracks for artist ID:", artistId);
  const allAlbums: SpotifyAlbum[] = [];

  // Fetch both albums and singles in one request
  let nextUrl: string | null =
    `https://api.spotify.com/v1/artists/${artistId}/albums`;
  let pageCount = 0;

  console.log("📀 Starting to fetch albums and singles...");
  while (nextUrl) {
    pageCount++;
    console.log(`📀 Fetching page ${pageCount}:`, nextUrl);

    if (pageCount > 50) {
      console.error(
        "⚠️ WARNING: Too many pages, breaking to prevent infinite loop",
      );
      break;
    }

    const albumsData: SpotifyAlbumsResponse = await ky
      .get(nextUrl, {
        headers: {
          Authorization: "Bearer " + token,
        },
        searchParams: {
          market: "us",
          limit: "50",
          // Include both albums and singles
          include_groups: "album,single",
        },
      })
      .json();

    console.log(
      `📀 Page ${pageCount}: Found ${albumsData.items.length} releases`,
    );
    allAlbums.push(...albumsData.items);

    nextUrl = albumsData.next;
    console.log(`📀 Next URL: ${nextUrl ? "Yes" : "No"}`);
  }

  console.log(`📀 Total releases fetched: ${allAlbums.length}`);

  // Deduplicate albums/singles by name and release date to avoid duplicate tracks
  const uniqueReleases = deduplicateReleases(allAlbums);
  console.log(
    `📀 Unique releases after deduplication: ${uniqueReleases.length}`,
  );

  const albumIds = uniqueReleases.map((album) => ({
    id: album.id,
    name: album.name,
    coverUrl: album.images[0]?.url ?? "",
    albumType: album.album_type, // 'album' or 'single'
  }));

  console.log(`🎵 Processing ${albumIds.length} unique releases`);

  const tracksToInsert: {
    spotify_id: string;
    artist_id: string;
    name: string;
    album_cover_url: string;
  }[] = [];

  // Use Set to track unique track IDs to avoid duplicates
  const processedTrackIds = new Set<string>();
  let releaseCount = 0;

  for (const release of albumIds) {
    releaseCount++;

    // Increased limit since we're now processing both albums and singles
    if (releaseCount > 300) {
      console.error(
        "⚠️ WARNING: Too many releases to process, breaking to prevent timeout",
      );
      break;
    }

    try {
      const albumTracksData = await ky
        .get(`https://api.spotify.com/v1/albums/${release.id}/tracks`, {
          searchParams: {
            market: "us",
          },
          headers: {
            Authorization: "Bearer " + token,
          },
        })
        .json<SpotifyAlbumTracksResponse>();

      console.log(
        `🎵 ${release.albumType} "${release.name}" has ${albumTracksData.items.length} tracks`,
      );

      albumTracksData.items.forEach((track) => {
        // Only add if we haven't seen this track ID before
        if (!processedTrackIds.has(track.id)) {
          processedTrackIds.add(track.id);
          tracksToInsert.push({
            spotify_id: track.id,
            artist_id: artistId,
            name: track.name,
            album_cover_url: release.coverUrl,
          });
        }
      });
    } catch (error) {
      console.error(`❌ Failed to fetch tracks for ${release.name}:`, error);
      // Continue processing other releases
    }
  }

  console.log(
    `💾 Prepared ${tracksToInsert.length} unique tracks for insertion`,
  );

  if (tracksToInsert.length > 0 && !fetchOnly) {
    console.log("💾 Inserting tracks into database...");
    await db.insert(trackSchema).values(tracksToInsert).onConflictDoNothing({
      target: trackSchema.spotify_id,
    });
    console.log("✅ Tracks inserted successfully");
  } else if (fetchOnly) {
    console.log("ℹ️ Fetch-only mode, skipping database insertion");
  }

  return tracksToInsert;
}

async function addFeatureTrack(
  targetArtistName: string,
  featureTrackId: string,
) {
  console.log(
    "🎵 Adding feature track:",
    featureTrackId,
    "to artist:",
    targetArtistName,
  );

  const token = await getSpotifyAccessToken();
  if (!token) {
    console.log("❌ Failed to get Spotify token");
    return NextResponse.json(
      { error: "Failed to get Spotify access token" },
      { status: 500 },
    );
  }

  let targetArtist = await db.query.artists.findFirst({
    where: eq(artistSchema.name, targetArtistName.toLowerCase()),
  });

  if (!targetArtist) {
    console.log("🔍 Target artist not found, searching Spotify");
    const targetSpotifyData = await searchSpotifyArtist(
      targetArtistName,
      token,
    );
    if (!targetSpotifyData) {
      console.log("❌ Target artist not found on Spotify");
      return NextResponse.json(
        { error: "Target artist not found on Spotify" },
        { status: 404 },
      );
    }

    const [insertedArtist] = await db
      .insert(artistSchema)
      .values({
        spotify_id: targetSpotifyData.id,
        name: targetSpotifyData.name.toLowerCase(),
      })
      .returning();
    targetArtist = insertedArtist;
    console.log("✅ Created target artist:", targetArtist?.name);
  }

  if (!targetArtist) {
    console.log("❌ Failed to create target artist");
    return NextResponse.json(
      { error: "Failed to create target artist" },
      { status: 500 },
    );
  }

  console.log("📡 Fetching feature track info from Spotify");
  const featureTrackInfo = await ky
    .get(`https://api.spotify.com/v1/tracks/${featureTrackId}`, {
      headers: {
        Authorization: "Bearer " + token,
      },
    })
    .json<{
      id: string;
      name: string;
      artists: Array<{ id: string; name: string }>;
      album: {
        images: Array<{ url: string; height: number; width: number }>;
      };
    }>();

  console.log("🔍 Checking if track already exists");
  const existingTrack = await db.query.tracks.findFirst({
    where: eq(trackSchema.spotify_id, featureTrackId),
  });

  if (existingTrack) {
    console.log("❌ Track already exists in database");
    return NextResponse.json(
      { error: "This track is already in the database" },
      { status: 400 },
    );
  }

  console.log("💾 Inserting feature track");
  await db.insert(trackSchema).values({
    spotify_id: featureTrackInfo.id,
    artist_id: targetArtist.spotify_id,
    name: featureTrackInfo.name,
    album_cover_url: featureTrackInfo.album.images[0]?.url ?? "",
  });

  const allTargetTracks = await db.query.tracks.findMany({
    where: eq(trackSchema.artist_id, targetArtist.spotify_id),
  });

  console.log("✅ Feature track added successfully");
  return NextResponse.json({
    artist: targetArtist,
    tracks: allTargetTracks,
    addedFeature: true,
    featureTrack: featureTrackInfo.name,
  });
}

function deduplicateReleases(releases: SpotifyAlbum[]): SpotifyAlbum[] {
  const seen = new Map<string, SpotifyAlbum>();

  for (const release of releases) {
    const key = `${release.name.toLowerCase()}-${release.release_date}`;

    if (seen.has(key)) {
      const existing = seen.get(key)!;
      if (release.album_type === "album" && existing.album_type === "single") {
        seen.set(key, release);
      }
    } else seen.set(key, release);
  }

  return Array.from(seen.values());
}
