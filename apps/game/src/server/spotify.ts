import ky from "ky";
import { env } from "~/env";

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export async function getSpotifyAccessToken() {
  const auth = Buffer.from(
    `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`,
  ).toString("base64");

  const resp = await ky
    .post("https://accounts.spotify.com/api/token", {
      headers: {
        Authorization: "Basic " + auth,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "client_credentials" }),
    })
    .json<SpotifyTokenResponse>();

  return resp.access_token;
}
