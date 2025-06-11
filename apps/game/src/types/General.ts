export type DailySongResponse = {
  date: string;
  artist: {
    name: string;
    spotify_id: string;
  };
  totalTracks: number;
  isManuallySet: boolean;
  hints: {
    croppedImageUrls: string[];
    maxHints: number;
  };
  track?: {
    name: string;
    spotify_id: string;
    album_cover_url: string;
    preview_url: string;
  };
  allTracks?: string[];
};
