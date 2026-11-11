# 1️⃣ Builder Stage
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# copy ทั้งโปรเจกต์ก่อน install (แก้ปัญหา postinstall)
COPY . .

# install
RUN pnpm install --frozen-lockfile

# build
RUN pnpm build


# 2️⃣ Runner Stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# log directory (mounted as a volume in docker-compose.yml)
RUN mkdir -p /app/logs
ENV LOG_DIR=/app/logs

EXPOSE 3000

CMD ["node", "server.js"]
