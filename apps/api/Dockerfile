FROM oven/bun:1-alpine AS base

WORKDIR /app/apps/api

RUN apk add --no-cache ffmpeg

COPY apps/api/package.json ./package.json
COPY apps/api/bun.lock* ./bun.lock*

RUN bun install

COPY apps/api/src/ ./src/
COPY apps/api/tsconfig.json ./tsconfig.json

COPY packages/ ./packages/

RUN chown -R bun:bun /app/apps/api
USER bun

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
