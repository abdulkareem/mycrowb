import { useMemo } from 'react';
import Layout from '../../components/layout/Layout';
import ShopMap from '../../components/map/ShopMap';

const STAFF_ASSIGNMENT_KEY = 'mycrowb_staff_route_assignments';

export default function ShopMapViewPage() {
  const shops = useMemo(() => {
    const value = JSON.parse(localStorage.getItem(STAFF_ASSIGNMENT_KEY) || '{}');
    return Object.values(value)
      .flatMap((assignment) => assignment.shops || [])
      .filter((shop) => Number.isFinite(shop.latitude) && Number.isFinite(shop.longitude))
      .map((shop) => ({ ...shop, status: 'pending' }));
  }, []);

  return (
    <Layout title="Shop Map View">
      {shops.length ? <ShopMap shops={shops} /> : <p className="rounded-xl bg-white p-6 text-sm text-gray-500 shadow-sm">No assigned shops are available for map view.</p>}
    </Layout>
  );
}
