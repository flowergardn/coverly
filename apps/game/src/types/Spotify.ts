export type SpotifyImage = {
  url: string;
  height: number;
  width: number;
};

type SpotifyArtist = {
  external_urls: {
    spotify: string;
  };
  followers: {
    href: string | null;
    total: number;
  };
  genres: string[];
  href: string;
  id: string;
  images: SpotifyImage[];
  name: string;
  popularity: number;
  type: string;
  uri: string;
};

export type SpotifyArtistResponse = {
  artists: {
    href: string;
    limit: number;
    next: string | null;
    offset: number;
    previous: string | null;
    total: number;
    items: SpotifyArtist[];
  };
};

type SimpleArtist = Omit<SpotifyArtist, "followers" | "genres" | "popularity">;

type ExternalURLs = {
  spotify: string;
};

type SpotifyTrack = {
  album: {
    album_type: string;
    total_tracks: number;
    available_markets: string[];
    external_urls: ExternalURLs;
    href: string;
    id: string;
    images: SpotifyImage[];
    name: string;
    release_date: string;
    release_date_precision: string;
    type: string;
    uri: string;
    artists: SimpleArtist[];
    is_playable: boolean;
  };
  artists: SimpleArtist[];
  duration_ms: number;
  explicit: boolean;
  external_urls: ExternalURLs;
  id: string;
  name: string;
  popularity: number;
  preview_url: string | null;
  track_number: number;
  type: "track";
  uri: string;
};

export type SpotifyTrackResponse = {
  tracks: SpotifyTrack[];
};

export type SpotifyRestriction = {
  reason: string;
};

export type SpotifyAlbum = {
  album_type: string;
  total_tracks: number;
  available_markets: string[];
  external_urls: ExternalURLs;
  href: string;
  id: string;
  images: SpotifyImage[];
  name: string;
  release_date: string;
  release_date_precision: string;
  restrictions?: SpotifyRestriction;
  type: string;
  uri: string;
  artists: SimpleArtist[];
  album_group?: string;
};

export type SpotifyAlbumsResponse = {
  href: string;
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
  items: SpotifyAlbum[];
};

export type SpotifyAlbumTrack = {
  artists: SimpleArtist[];
  available_markets: string[];
  disc_number: number;
  duration_ms: number;
  explicit: boolean;
  external_urls: ExternalURLs;
  href: string;
  id: string;
  is_playable: boolean;
  linked_from?: {
    external_urls: ExternalURLs;
    href: string;
    id: string;
    type: string;
    uri: string;
  };
  restrictions?: SpotifyRestriction;
  name: string;
  preview_url: string | null;
  track_number: number;
  type: string;
  uri: string;
  is_local: boolean;
};

export type SpotifyAlbumTracksResponse = {
  href: string;
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
  items: SpotifyAlbumTrack[];
};
