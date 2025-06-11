import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { env } from "~/env";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getBaseURL() {
  const vercelUrl = env.NEXT_PUBLIC_VERCEL_BRANCH_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return "http://localhost:3000/";
}

export function getDailySongIndex(
  artistName: string,
  totalTracks: number,
): number {
  const today = new Date();
  const dateString = today.toISOString().split("T")[0];
  const seed = `${dateString}-${artistName}`;

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  return Math.abs(hash) % totalTracks;
}
