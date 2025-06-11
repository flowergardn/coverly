FROM oven/bun:1-alpine AS base
WORKDIR /app

RUN apk add --no-cache ffmpeg

COPY package.json bun.lock* ./

RUN bun install

COPY . .

RUN chown -R bun:bun /app
USER bun

EXPOSE 3000

CMD ["bun", "run", "start"]
