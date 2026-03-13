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
app.use('/api/v1', routes);
app.use('/api', routes);
app.use(errorHandler);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`MYCROWB backend running at http://localhost:${port}`);
});
