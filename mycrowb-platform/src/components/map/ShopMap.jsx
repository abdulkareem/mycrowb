import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const colorByStatus = { collected: 'green', pending: 'yellow', missed: 'red' };

function FitMapToShops({ shops }) {
  const map = useMap();

  useEffect(() => {
    if (!shops.length) return;
    const bounds = shops.map((shop) => [shop.latitude, shop.longitude]);
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [map, shops]);

  return null;
}

export default function ShopMap({ shops }) {
  return (
    <MapContainer center={[12.97, 77.59]} zoom={11} className="h-96 rounded-xl">
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitMapToShops shops={shops} />
      {shops.map((s) => (
        <CircleMarker key={s.id} center={[s.latitude, s.longitude]} radius={8} pathOptions={{ color: colorByStatus[s.status] || 'gray' }}>
          <Popup>
            <div className="text-xs">
              <p><strong>{s.shopName}</strong></p>
              <p>Owner: {s.ownerName || '-'}</p>
              <p>Cluster: {s.clusterName || '-'}</p>
              <p>Status: {s.status}</p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
