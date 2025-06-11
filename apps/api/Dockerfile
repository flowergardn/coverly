FROM oven/bun:1-alpine AS base
WORKDIR /app

RUN apk add --no-cache ffmpeg

COPY apps/coverly-api/package.json apps/coverly-api/bun.lock* ./

RUN bun install

COPY apps/coverly-api/src/ ./src/

RUN chown -R bun:bun /app
USER bun

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
