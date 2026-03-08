FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

RUN apk add --no-cache openssl

COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Run migrations when container starts
CMD ["./scripts/start.sh"]
