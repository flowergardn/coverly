import type { Track } from "~/types/Soundcloud";
import ky from "ky";

const clientIdRegex = new RegExp(/client_id=(:?[\w\d]{32})/);
const scriptUrl = new RegExp(
  /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)$/,
);

export const apiBaseUrl = "https://api-v2.soundcloud.com";
const soundCloudUrl = "https://soundcloud.com";

export type SearchFilter = "tracks" | "users" | "albums" | "playlists" | "all";

export interface SearchOptions {
  query: string;
  limit?: number;
  offset?: number;
  filter?: SearchFilter;
}

export interface SearchResponse<T = Track> {
  collection: T[];
  total_results: number;
  next_href?: string;
  query_urn: string;
}

async function search(clientId: string, searchOptions: SearchOptions) {
  const { query, limit = 20, offset = 0, filter = "all" } = searchOptions;
  const path = filter === "all" ? "" : `/${filter}`;
  const baseUrl = `${apiBaseUrl}/search${path}`;

  try {
    const response = await ky
      .get(baseUrl, {
        searchParams: {
          q: query,
          limit,
          offset,
          access: "playable",
          client_id: clientId,
        },
      })
      .json<SearchResponse>();
    return response;
  } catch (e) {
    throw e;
  }
}

const getTracksByIds = async (
  clientId: string,
  ids: number[],
): Promise<Track[]> => {
  const res: Track[] = [];
  try {
    const url = encodeURI(
      `${apiBaseUrl}/tracks?ids=${ids.join(",")}&client_id=${clientId}`,
    );
    const response = await ky.get(url).json<Track[]>();
    res.push(...response);
    return res;
  } catch (e) {
    throw e;
  }
};

const getTrackById = async (clientId: string, id: number): Promise<Track> => {
  const res = await getTracksByIds(clientId, [id]);
  if (!res[0]) throw new Error("Invalid track id: " + id);
  return res[0];
};

async function getClientId() {
  try {
    const soundCloudDom = await ky.get(soundCloudUrl).text();
    const paths = soundCloudDom.split('<script crossorigin src="');
    const urls: string[] = [];
    paths.forEach((path: string) => {
      const url = path.replace('"></script>', "");
      const res = url.split("\n")[0];
      if (!res) return;
      if (scriptUrl.test(res)) urls.push(res);
    });

    for (const url of urls) {
      const response = await ky.get(url).text();
      const matchResult = RegExp(clientIdRegex).exec(response);
      if (matchResult !== null) {
        return matchResult[1];
      }
    }
  } catch (e) {
    console.log(e);
  }
}

export { search, getClientId, getTrackById };
