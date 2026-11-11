FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate

FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/index.ts ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/tsconfig.json ./

# Install ts-node globally if needed or run via npx
RUN npm install -g ts-node typescript

EXPOSE 3001

CMD ["ts-node", "index.ts"]
