FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Run migrations when container starts
CMD ["sh","-c","npx prisma migrate deploy && node server.js"]
