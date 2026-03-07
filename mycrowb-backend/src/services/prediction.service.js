const axios = require('axios');
const { aiServiceUrl } = require('../config/env');

async function predictNextMonth(payload) {
  const { data } = await axios.post(`${aiServiceUrl}/predict`, payload, { timeout: 5000 });
  return data;
}

module.exports = { predictNextMonth };
