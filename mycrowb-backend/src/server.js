const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { port, trustProxy, webhookVerifyToken, appApiKey } = require('./config/env');
const routes = require('./routes');
const { errorHandler } = require('./middleware/error.middleware');
const { whatsappWebhook } = require('./controllers/auth.controller');

const app = express();

app.set('trust proxy', trustProxy);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));
app.use('/uploads', express.static('uploads'));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1500,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const verifyWebhook = (req, res) => {
  const verifyToken = webhookVerifyToken;

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && verifyToken && token === verifyToken) {
    // eslint-disable-next-line no-console
    console.log('Webhook verified');
    res.status(200).send(challenge);
    return;
  }

  res.sendStatus(403);
};


const verifyAppApiKey = (req, res, next) => {
  const configuredApiKey = appApiKey;
  if (!configuredApiKey) return next();

  const incomingApiKey = req.get('x-api-key')
    || req.query.api_key
    || req.query.app_api_key
    || req.body?.api_key
    || req.body?.app_api_key;

  if (incomingApiKey !== configuredApiKey) {
    return res.status(401).json({ success: false, message: 'Invalid APP API key.' });
  }

  return next();
};

app.get('/webhook', verifyWebhook);
app.get('/webhook/whatsapp', verifyWebhook);

app.post('/webhook', verifyAppApiKey, whatsappWebhook);
app.post('/webhook/whatsapp', verifyAppApiKey, whatsappWebhook);

app.use('/api/v1', routes);
app.use('/api', routes);
app.use(errorHandler);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`MYCROWB backend running at http://localhost:${port}`);
});
