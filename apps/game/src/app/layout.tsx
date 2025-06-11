import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

export const metadata: Metadata = {
  title: "Coverly - Music Game",
  description:
    "Test your music knowledge! Guess songs from tiny, pixelated pieces of album cover art. Enter your favorite artist and see how well you know their discography. Daily challenges for you to try every day.",

  openGraph: {
    title: "Coverly - The Ultimate Music Cover Art Game",
    description:
      "🎵 Can you guess the song from just a piece of the cover art? Challenge yourself with your favorite artists and compete with friends!",
    type: "website",
    url: "https://coverly.astrid.sh",
    siteName: "Coverly",
    images: [
      {
        url: "https://coverly.astrid.sh/api/og",
        width: 1200,
        height: 630,
        alt: "Coverly - Music Game",
        type: "image/png",
      },
    ],
    locale: "en_US",
  },

  twitter: {
    card: "summary_large_image",
    title: "Coverly - The Ultimate Music Cover Art Game",
    description:
      "🎵 Test your music knowledge! Guess songs from pixelated album covers. Daily challenges for every artist!",
    images: ["/og-image.png"],
    creator: "@maybeastrid",
    site: "@maybeastrid",
  },

  keywords: [
    "music game",
    "album cover game",
    "song guessing game",
    "music trivia",
    "cover art quiz",
    "daily music challenge",
    "spotify game",
    "music knowledge test",
    "pixelated covers",
    "artist discography",
  ],

  authors: [{ name: "flowergarden" }],

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  applicationName: "Coverly",
  category: "Entertainment",

  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
  },

  manifest: "/site.webmanifest",

  other: {
    "theme-color": "#000000",
    "color-scheme": "dark",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} dark`}>
      <body>{children}</body>
    </html>
  );
}
