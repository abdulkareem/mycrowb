import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const colorByStatus = { collected: 'green', pending: 'yellow', missed: 'red' };

function FitMapToShops({ shops, staffLocation }) {
  const map = useMap();

  useEffect(() => {
    if (!shops.length && !staffLocation) return;
    const bounds = shops.map((shop) => [shop.latitude, shop.longitude]);
    if (staffLocation) bounds.push([staffLocation.latitude, staffLocation.longitude]);
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [map, shops, staffLocation]);

  return null;
}

export default function ShopMap({ shops, staffLocation }) {
  return (
    <MapContainer center={[12.97, 77.59]} zoom={11} className="h-96 rounded-xl">
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitMapToShops shops={shops} staffLocation={staffLocation} />
      {shops.map((s) => (
        <CircleMarker key={s.id} center={[s.latitude, s.longitude]} radius={8} pathOptions={{ color: colorByStatus[s.status] || 'gray' }}>
          <Tooltip permanent direction="top" offset={[0, -10]}>
            <div className="text-[10px] leading-4">
              <p><strong>{s.shopName}</strong> ({s.status})</p>
              <p>{s.ownerName || '-'} • {s.place || '-'}</p>
            </div>
          </Tooltip>
          <Popup>
            <div className="text-xs">
              <p><strong>{s.shopName}</strong></p>
              <p>Owner: {s.ownerName || '-'}</p>
              <p>Place: {s.place || '-'}</p>
              <p>Cluster: {s.clusterName || '-'}</p>
              <p>Status: {s.status}</p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
      {staffLocation && (
        <CircleMarker center={[staffLocation.latitude, staffLocation.longitude]} radius={9} pathOptions={{ color: 'blue' }}>
          <Tooltip permanent direction="top" offset={[0, -10]}>Staff location</Tooltip>
          <Popup>
            <p className="text-xs font-semibold">Staff current location</p>
          </Popup>
        </CircleMarker>
      )}
    </MapContainer>
  );
}
