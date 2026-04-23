FROM node:22-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build; test -f .output/server/index.mjs

FROM node:22-slim AS runner

RUN apt-get update && apt-get install -y --fix-missing postgresql-client && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/.output .output
COPY stockfish /usr/bin/stockfish
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /usr/bin/stockfish /app/entrypoint.sh

ENV HOST=0.0.0.0
ENV PORT=3000
ENV STOCKFISH_PATH=/usr/bin/stockfish

EXPOSE 3000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", ".output/server/index.mjs"]
