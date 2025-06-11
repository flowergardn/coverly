FROM oven/bun:1-alpine AS base
WORKDIR /app

COPY package.json bun.lock* ./

RUN bun install

COPY . .

USER bun

EXPOSE 3000

CMD ["bun", "run", "start"]
