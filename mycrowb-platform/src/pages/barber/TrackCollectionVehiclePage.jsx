import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import Layout from '../../components/layout/Layout';
import ShopMap from '../../components/map/ShopMap';

function toMapShop(shop) {
  return {
    ...shop,
    status: 'pending'
  };
}

export default function TrackCollectionVehiclePage() {
  const [trackingData, setTrackingData] = useState({ routeShops: [], staffLocation: null, clusterName: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    client
      .get('/shops/me/track-vehicle')
      .then((res) => {
        const data = res.data;
        setTrackingData({
          routeShops: (data.routeShops || []).map(toMapShop),
          staffLocation: data.staffLocation || null,
          clusterName: data.clusterName || ''
        });
      })
      .catch(() => setError('Unable to load collection vehicle tracking data.'));
  }, []);

  return (
    <Layout title="Track Collection Vehicle">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <p className="text-gray-700">Track current staff location and nearby shops in your route cluster.</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 rounded-lg border border-gray-200 p-3 text-sm text-gray-700">
          <p><span className="font-medium">Cluster:</span> {trackingData.clusterName || '-'}</p>
          <p><span className="font-medium">Staff location:</span> {trackingData.staffLocation ? 'Live location available' : 'Not available yet'}</p>
        </div>

        <div className="mt-4">
          <ShopMap shops={trackingData.routeShops} staffLocation={trackingData.staffLocation} />
        </div>

        <div className="mt-4 flex gap-2">
          <Link to="/barber/dashboard" className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700">← Back</Link>
        </div>
      </section>
    </Layout>
  );
}
