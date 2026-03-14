# mycrowb-backend

Production backend for MYCROWB YOUR ECO FRIEND LLP.

## Deploy
1. Copy `.env.example` to `.env` and set values (`DATABASE_URL` must start with `postgresql://` or `postgres://`).
2. Run `npm install`.
3. Run `npx prisma generate && npx prisma migrate deploy`.
4. Start with `npm start`.

## WhatsApp platform integration
This backend integrates with `whatsapp_platform` for outbound messages and inbound routed webhooks.

### Required env vars
- `APP_API_KEY`: API key sent as `x-api-key` while calling platform send API.
- `WHATSAPP_PLATFORM_BASE_URL`: Base URL of platform (`https://...`).

### Optional env vars
- `WHATSAPP_PLATFORM_SEND_PATH` (default: `/api/messages/send`)
- `WHATSAPP_PLATFORM_TIMEOUT_MS` (default: `8000`)
- `WHATSAPP_PLATFORM_WEBHOOK_SECRET` (secret used for webhook signature/token verification)
- `WHATSAPP_PLATFORM_WEBHOOK_ALLOWED_IPS` (comma-separated source IP allowlist)

## API contracts
### Outbound send (this app -> platform)
`POST ${WHATSAPP_PLATFORM_BASE_URL}${WHATSAPP_PLATFORM_SEND_PATH}`

Headers:
- `x-api-key: $APP_API_KEY`
- `x-correlation-id: <uuid>`

Body:
```json
{
  "mobile": "919876543210",
  "message": "Hello from MYCROWB"
}
```

### Inbound routed webhook (platform -> this app)
`POST /api/whatsapp/webhook`

Body:
```json
{
  "mobile": "919876543210",
  "message": "MYCROWB PING",
  "keyword": "MYCROWB",
  "command": "PING",
  "trigger": {
    "keyword": "MYCROWB",
    "command": "PING",
    "fullText": "MYCROWB PING"
  }
}
```

Auth verification:
- Preferred: `x-webhook-signature: sha256=<hmac_of_raw_json_with_WHATSAPP_PLATFORM_WEBHOOK_SECRET>`
- Alternate: `x-webhook-token: <WHATSAPP_PLATFORM_WEBHOOK_SECRET>` and source IP in `WHATSAPP_PLATFORM_WEBHOOK_ALLOWED_IPS`

## Local testing
Expose local backend using ngrok/cloudflared and set callback URL to:
- `https://<public-host>/api/whatsapp/webhook`

## cURL examples
### Trigger outbound send through backend
```bash
curl -X POST "${APP_BASE_URL:-http://localhost:8080}/api/whatsapp/send" \
  -H "Content-Type: application/json" \
  -H "x-correlation-id: local-test-1" \
  -d '{"mobile":"9876543210","message":"Hello via platform"}'
```

### Simulate inbound webhook using token auth
```bash
curl -X POST "${APP_BASE_URL:-http://localhost:8080}/api/whatsapp/webhook" \
  -H "Content-Type: application/json" \
  -H "x-webhook-token: ${WHATSAPP_PLATFORM_WEBHOOK_SECRET}" \
  -d '{"mobile":"919876543210","message":"MYCROWB HELP","keyword":"MYCROWB","command":"HELP","trigger":{"keyword":"MYCROWB","command":"HELP","fullText":"MYCROWB HELP"}}'
```
