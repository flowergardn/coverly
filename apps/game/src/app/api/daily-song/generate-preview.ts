import ky from "ky";
import { env } from "~/env";
import { db, tracks as trackSchema } from "@coverly/db";
import * as soundcloud from "~/server/soundcloud";
import { eq } from "drizzle-orm";

type APIPreviewGenerationResponse = {
  success: boolean;
  message: string;
  cache?: boolean;
  clip?: {
    r2Key: string;
  };
};

export async function generatePreviewUrl(
  artist: { name: string },
  track: { id: number; name: string; preview_url: string | null },
): Promise<string | null> {
  if (track.preview_url) return track.preview_url;

  try {
    const clientId = await soundcloud.getClientId();
    if (!clientId) {
      console.warn("SoundCloud client ID not available");
      return null;
    }

    const searchResults = await soundcloud.search(clientId, {
      query: `${artist.name} - ${track.name}`,
      limit: 1,
    });

    const song = searchResults?.collection?.[0];
    if (!song?.permalink_url) {
      console.warn(
        `No SoundCloud track found for: ${artist.name} - ${track.name}`,
      );
      return null;
    }

    console.log(`Generating preview for: ${song.permalink_url}`);

    const response = await ky
      .post(`${env.API_URL}`, {
        searchParams: { clientId },
        json: { url: song.permalink_url },
        timeout: 30000,
      })
      .json<APIPreviewGenerationResponse>();

    if (!response.success || !response.clip?.r2Key) {
      console.warn(`Preview generation failed: ${response.message}`);
      return null;
    }

    const previewUrl = `https://coverly-cdn.astrid.sh/coverly/${response.clip.r2Key}`;

    await db
      .update(trackSchema)
      .set({ preview_url: previewUrl })
      .where(eq(trackSchema.id, track.id));

    console.log(`Preview generated successfully: ${previewUrl}`);
    return previewUrl;
  } catch (error) {
    console.error(
      `Failed to generate preview URL for ${artist.name} - ${track.name}:`,
      error,
    );
    return null;
  }
}
