import { Elysia } from "elysia";
import downloader from "./routes/download";
import { env } from "./env";

const app = new Elysia().use(downloader).listen(env.PORT);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
