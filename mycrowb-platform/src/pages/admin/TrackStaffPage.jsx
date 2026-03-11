import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import Layout from '../../components/layout/Layout';
import ShopMap from '../../components/map/ShopMap';

export default function TrackStaffPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const backPath = user?.role === 'SUPER_ADMIN' ? '/super-admin/overview' : '/admin/overview';
  const [staffOptions, setStaffOptions] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    client
      .get('/staff')
      .then((response) => {
        const options = (response.data || []).map((staff) => ({
          id: staff.id,
          label: `${staff.name} (${staff.staffIdNumber || 'No ID'})`
        }));
        setStaffOptions(options);
      })
      .catch(() => setMessage('Unable to load staff list.'));
  }, []);

  useEffect(() => {
    if (!selectedStaffId) {
      setDetails(null);
      return;
    }

    setLoading(true);
    setMessage('');

    client
      .get(`/track-staff/${selectedStaffId}`)
      .then((response) => setDetails(response.data))
      .catch((error) => {
        setDetails(null);
        setMessage(error.response?.data?.message || 'Unable to load tracking details.');
      })
      .finally(() => setLoading(false));
  }, [selectedStaffId]);

  const mapPoints = useMemo(() => {
    if (!details?.mapPoints) return [];

    const points = [];
    if (details.mapPoints.staff) {
      points.push({
        id: 'staff-location',
        shopName: `${details.staff?.name || 'Staff'} current location`,
        ownerName: details.staff?.vehicleNumber || '-',
        clusterName: details.staff?.clusterName || '-',
        latitude: Number(details.mapPoints.staff.latitude),
        longitude: Number(details.mapPoints.staff.longitude),
        status: 'collected'
      });
    }

    if (details.mapPoints.shop) {
      points.push({
        id: 'shop-location',
        shopName: details.mapPoints.shop.shopName || 'Last collected shop',
        ownerName: 'Shop location',
        clusterName: details.mapPoints.shop.clusterName || '-',
        latitude: Number(details.mapPoints.shop.latitude),
        longitude: Number(details.mapPoints.shop.longitude),
        status: 'pending'
      });
    }

    return points.filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
  }, [details]);

  return (
    <Layout title="Track Staff">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-gray-700">Select a staff member to view live collection-linked location details.</p>
          <button type="button" onClick={() => navigate(backPath)} className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700">Back</button>
        </div>

        <div className="mb-4">
          <label className="mr-2 text-sm text-gray-700" htmlFor="staff-select">Staff</label>
          <select
            id="staff-select"
            className="min-w-72 rounded border border-gray-300 px-2 py-1"
            value={selectedStaffId}
            onChange={(event) => setSelectedStaffId(event.target.value)}
          >
            <option value="">Select staff</option>
            {staffOptions.map((staff) => (
              <option key={staff.id} value={staff.id}>{staff.label}</option>
            ))}
          </select>
        </div>

        {message && <p className="mb-4 text-sm text-red-600">{message}</p>}
        {loading && <p className="text-sm text-gray-600">Loading tracking details...</p>}

        {!loading && details && (
          <>
            <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-md bg-lightGreen/40 p-3"><strong>Current cluster:</strong> {details.staff?.clusterName || '-'}</div>
              <div className="rounded-md bg-lightGreen/40 p-3"><strong>Vehicle:</strong> {details.staff?.vehicleNumber || '-'}</div>
              <div className="rounded-md bg-lightGreen/40 p-3"><strong>Last collected shop:</strong> {details.lastCollection?.shop?.shopName || '-'}</div>
            </div>

            <div className="mt-3 rounded-md border border-gray-200 p-3 text-sm text-gray-700">
              <p><strong>Shop cluster:</strong> {details.lastCollection?.shop?.clusterName || '-'}</p>
              <p><strong>Shop address:</strong> {details.lastCollection?.shop?.address || '-'}</p>
              <p><strong>Last collection date:</strong> {details.lastCollection?.collectionDate ? new Date(details.lastCollection.collectionDate).toLocaleString() : '-'}</p>
            </div>

            <div className="mt-4">
              <h2 className="mb-2 text-base font-semibold">Staff & shop location map</h2>
              {mapPoints.length ? <ShopMap shops={mapPoints} /> : <p className="text-sm text-gray-500">No map points available for selected staff.</p>}
            </div>
          </>
        )}
      </section>
    </Layout>
  );
}
