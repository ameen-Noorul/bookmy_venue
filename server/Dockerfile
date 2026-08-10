FROM node:20-alpine

WORKDIR /app

# Alpine ships without OpenSSL by default. Prisma's query engine is a
# compiled binary (not JS) that needs it to connect to Postgres — without
# this, the app starts fine but crashes the moment it makes its first
# database query.
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN npx prisma generate

EXPOSE 3000
CMD ["node", "src/server.js"]