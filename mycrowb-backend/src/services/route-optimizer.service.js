const axios = require('axios');
const { osrmBaseUrl } = require('../config/env');

async function optimizeRoute(shops) {
  if (!shops.length) return { trips: [], waypoints: [] };
  const coordinates = shops.map((s) => `${s.longitude},${s.latitude}`).join(';');
  const { data } = await axios.get(`${osrmBaseUrl}/trip/v1/driving/${coordinates}`, {
    params: { source: 'first', roundtrip: false, geometries: 'geojson' }
  });

  return {
    geometry: data.trips?.[0]?.geometry || null,
    orderedStops: (data.waypoints || []).map((w) => shops[w.waypoint_index])
  };
}

module.exports = { optimizeRoute };
