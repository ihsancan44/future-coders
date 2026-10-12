FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src
ENV NODE_ENV=production PORT=4000
EXPOSE 4000
# Veritabanı şemasını uygular, örnek veriyi (sadece boşsa) ekler ve API'yi başlatır.
CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/seed.js && node src/server.js"]
