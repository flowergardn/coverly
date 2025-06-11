FROM oven/bun:1-alpine AS base
WORKDIR /app

RUN apk add --no-cache ffmpeg

COPY apps/api/package.json ./apps/api/
COPY apps/api/bun.lock* ./apps/api/

RUN bun install

COPY apps/api/* ./apps/api/

RUN chown -R bun:bun /app
USER bun

WORKDIR /app/apps/api

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
