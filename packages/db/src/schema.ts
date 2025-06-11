// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import {
  pgTableCreator,
  text,
  varchar,
  serial,
  integer,
  boolean,
} from "drizzle-orm/pg-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `cover-game_${name}`);

export const artists = createTable("artists", {
  id: serial("id").primaryKey(),
  spotify_id: varchar("spotify_id", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
});

export const tracks = createTable("tracks", {
  id: serial("id").primaryKey(),
  spotify_id: varchar("spotify_id", { length: 50 }).notNull().unique(),
  artist_id: varchar("artist_id").references(() => artists.spotify_id),
  name: varchar("name", { length: 255 }).notNull(),
  album_cover_url: text("album_cover_url").notNull(),
  playable: boolean("playable").default(true).notNull(),
  preview_url: text("preview_url"),
});

export const dailySong = createTable("daily_song", {
  song_id: varchar("song_id").references(() => tracks.spotify_id),
  // this is the name of the artist rather than the id, on purpose
  artist: varchar("artist"),
  date: varchar("date"),
});
