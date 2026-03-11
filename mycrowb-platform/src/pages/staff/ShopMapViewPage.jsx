import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import ShopMap from '../../components/map/ShopMap';

const STAFF_ASSIGNMENT_KEY = 'mycrowb_staff_route_assignments';
const STAFF_COLLECTION_KEY = 'mycrowb_staff_collection_updates';

const isValidCoordinate = (latitude, longitude) => {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

export default function ShopMapViewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedShopId = searchParams.get('shopId');

  const shops = useMemo(() => {
    const routeAssignments = JSON.parse(localStorage.getItem(STAFF_ASSIGNMENT_KEY) || '{}');
    const collectionByShopId = JSON.parse(localStorage.getItem(STAFF_COLLECTION_KEY) || '{}');

    const allShops = Object.values(routeAssignments)
      .flatMap((assignment) => assignment.shops || [])
      .filter((shop) => isValidCoordinate(shop.latitude, shop.longitude))
      .map((shop) => ({
        ...shop,
        latitude: Number(shop.latitude),
        longitude: Number(shop.longitude),
        status: collectionByShopId[shop.id]?.status === 'collected' ? 'collected' : 'pending'
      }));

    if (!selectedShopId) return allShops;
    return allShops.filter((shop) => shop.id === selectedShopId);
  }, [selectedShopId]);

  return (
    <Layout title="Shop Map View">
      <button type="button" className="mb-3 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700" onClick={() => navigate('/staff/today-route')}>
        ← Back
      </button>
      {shops.length ? <ShopMap shops={shops} /> : <p className="rounded-xl bg-white p-6 text-sm text-gray-500 shadow-sm">No assigned shops are available for map view.</p>}
    </Layout>
  );
}
