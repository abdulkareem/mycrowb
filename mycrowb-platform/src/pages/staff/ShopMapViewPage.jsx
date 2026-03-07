import Layout from '../../components/layout/Layout';
import ShopMap from '../../components/map/ShopMap';

const shops = [
  { id: '1', shopName: 'Green Cut', latitude: 12.97, longitude: 77.59, status: 'collected' },
  { id: '2', shopName: 'Style Hub', latitude: 12.95, longitude: 77.61, status: 'pending' },
  { id: '3', shopName: 'Urban Fade', latitude: 12.99, longitude: 77.57, status: 'missed' }
];

export default function ShopMapViewPage() {
  return <Layout title="Shop Map View"><ShopMap shops={shops} /></Layout>;
}
