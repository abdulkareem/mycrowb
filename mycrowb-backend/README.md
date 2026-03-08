# mycrowb-backend

Production backend for MYCROWB YOUR ECO FRIEND LLP.

## Deploy
1. Copy `.env.example` to `.env` and set values (`DATABASE_URL` must start with `postgresql://` or `postgres://`).
2. Run `npm install`.
3. Run `npx prisma generate && npx prisma migrate deploy`.
4. Start with `npm start`.
