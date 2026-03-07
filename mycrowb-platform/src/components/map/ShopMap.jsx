import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const colorByStatus = { collected: 'green', pending: 'yellow', missed: 'red' };

export default function ShopMap({ shops }) {
  return (
    <MapContainer center={[12.97, 77.59]} zoom={11} className="h-96 rounded-xl">
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {shops.map((s) => (
        <CircleMarker key={s.id} center={[s.latitude, s.longitude]} radius={8} pathOptions={{ color: colorByStatus[s.status] || 'gray' }}>
          <Popup>{s.shopName} - {s.status}</Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
