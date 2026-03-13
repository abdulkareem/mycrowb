const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { port, trustProxy } = require('./config/env');
const routes = require('./routes');
const { errorHandler } = require('./middleware/error.middleware');

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

app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = 'Kareem@123';

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    // eslint-disable-next-line no-console
    console.log('Webhook verified');
    res.status(200).send(challenge);
    return;
  }

  res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object === 'whatsapp_business_account') {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (value?.messages) {
      const message = value.messages[0];
      const from = message.from;
      const text = message.text?.body;

      // eslint-disable-next-line no-console
      console.log('Message from:', from);
      // eslint-disable-next-line no-console
      console.log('Text:', text);
    }
  }

  res.sendStatus(200);
});

app.use('/api/v1', routes);
app.use('/api', routes);
app.use(errorHandler);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`MYCROWB backend running at http://localhost:${port}`);
});
