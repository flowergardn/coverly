"use server";

import { cookies } from "next/headers";

export async function setWin(artistName: string, spotifyId: string) {
  const cookieJar = await cookies();

  cookieJar.set("last_won_game_" + artistName, spotifyId, {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
}
