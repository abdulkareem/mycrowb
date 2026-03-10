import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import ShopMap from '../../components/map/ShopMap';
import client from '../../api/client';

const STAFF_ASSIGNMENT_KEY = 'mycrowb_staff_route_assignments';
const BARBER_NOTIFICATION_KEY = 'mycrowb_barber_notifications';

const normalizeCluster = (value = '') => value.trim().toLowerCase();

export default function RouteOptimizationPage() {
  const [staffList, setStaffList] = useState([]);
  const [shops, setShops] = useState([]);
  const [clusterByStaffId, setClusterByStaffId] = useState({});
  const [dateByStaffId, setDateByStaffId] = useState({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [staffResponse, shopResponse] = await Promise.all([
          client.get('/staff'),
          client.get('/shops')
        ]);
        setStaffList(staffResponse.data || []);
        setShops(shopResponse.data || []);
      } catch (_error) {
        setMessage('Unable to load staff or shop data for route allocation.');
      }
    };

    loadData();
  }, []);

  const allClusters = useMemo(() => {
    const fromShops = shops.map((shop) => shop.clusterName).filter(Boolean);
    const fromStaff = staffList
      .flatMap((staff) => String(staff.clustersAllotted || '').split(','))
      .map((name) => name.trim())
      .filter(Boolean);
    return [...new Set([...fromShops, ...fromStaff])].sort((a, b) => a.localeCompare(b));
  }, [shops, staffList]);

  const mapShops = useMemo(() => shops
    .filter((shop) => Number.isFinite(Number(shop.latitude)) && Number.isFinite(Number(shop.longitude)))
    .map((shop) => ({
      id: shop.id,
      shopName: shop.shopName,
      latitude: Number(shop.latitude),
      longitude: Number(shop.longitude),
      status: 'pending'
    })), [shops]);

  const handleSendToStaff = (staff) => {
    const selectedCluster = clusterByStaffId[staff.id] || '';
    const selectedDate = dateByStaffId[staff.id] || '';

    if (!selectedCluster || !selectedDate) {
      setMessage(`Please select cluster and date for ${staff.name}.`);
      return;
    }

    const clusterShops = shops.filter((shop) => normalizeCluster(shop.clusterName) === normalizeCluster(selectedCluster));
    const assignments = JSON.parse(localStorage.getItem(STAFF_ASSIGNMENT_KEY) || '{}');
    assignments[staff.staffIdNumber] = {
      staffIdNumber: staff.staffIdNumber,
      staffName: staff.name,
      vehicleNumber: staff.vehicleNumber,
      clusterName: selectedCluster,
      date: selectedDate,
      shops: clusterShops.map((shop) => ({
        id: shop.id,
        shopName: shop.shopName,
        ownerName: shop.ownerName,
        latitude: Number(shop.latitude),
        longitude: Number(shop.longitude)
      })),
      sentAt: new Date().toISOString()
    };
    localStorage.setItem(STAFF_ASSIGNMENT_KEY, JSON.stringify(assignments));

    const notifications = JSON.parse(localStorage.getItem(BARBER_NOTIFICATION_KEY) || '[]');
    const nextNotifications = [
      ...notifications,
      ...clusterShops.map((shop) => ({
        id: `${shop.id}-${Date.now()}`,
        shopId: shop.id,
        shopName: shop.shopName,
        clusterName: selectedCluster,
        date: selectedDate,
        message: `Hair collection from your shop is on ${selectedDate}.`,
        createdAt: new Date().toISOString()
      }))
    ];
    localStorage.setItem(BARBER_NOTIFICATION_KEY, JSON.stringify(nextNotifications));

    setMessage(`Route sent to ${staff.name} and ${clusterShops.length} shop notification(s) queued.`);
  };

  return (
    <Layout title="Route Optimization Dashboard">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-gray-700">Assign cluster routes to staff and send pickup updates to barber notifications.</p>
          <Link className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700" to="/admin/overview">← Back</Link>
        </div>

        {message && <p className="mb-4 rounded-md bg-gray-50 p-2 text-sm text-gray-700">{message}</p>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2">Staff ID</th>
                <th className="p-2">Staff Name</th>
                <th className="p-2">Vehicle Number</th>
                <th className="p-2">Cluster Selection</th>
                <th className="p-2">Date Selection</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((staff) => {
                const staffClusters = String(staff.clustersAllotted || '')
                  .split(',')
                  .map((name) => name.trim())
                  .filter(Boolean);
                const clusterOptions = staffClusters.length ? staffClusters : allClusters;

                return (
                  <tr className="border-b border-gray-200" key={staff.id}>
                    <td className="p-2">{staff.staffIdNumber}</td>
                    <td className="p-2">{staff.name}</td>
                    <td className="p-2">{staff.vehicleNumber || '-'}</td>
                    <td className="p-2">
                      <select
                        className="w-full rounded-md border border-gray-300 px-2 py-1"
                        onChange={(event) => setClusterByStaffId((prev) => ({ ...prev, [staff.id]: event.target.value }))}
                        value={clusterByStaffId[staff.id] || ''}
                      >
                        <option value="">Select cluster</option>
                        {clusterOptions.map((cluster) => (
                          <option key={cluster} value={cluster}>{cluster}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        className="w-full rounded-md border border-gray-300 px-2 py-1"
                        onChange={(event) => setDateByStaffId((prev) => ({ ...prev, [staff.id]: event.target.value }))}
                        type="date"
                        value={dateByStaffId[staff.id] || ''}
                      />
                    </td>
                    <td className="p-2">
                      <button
                        className="rounded-md bg-primaryGreen px-3 py-2 text-xs font-medium text-white"
                        onClick={() => handleSendToStaff(staff)}
                        type="button"
                      >
                        Send to staff
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!staffList.length && (
                <tr>
                  <td className="p-4 text-center text-gray-500" colSpan="6">No staff records available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <h2 className="mb-2 text-base font-semibold text-gray-800">Shop positions map</h2>
          <p className="mb-3 text-sm text-gray-600">Shops are plotted using saved longitude and latitude coordinates.</p>
          {!!mapShops.length && <ShopMap shops={mapShops} />}
          {!mapShops.length && <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-500">No shops with coordinates are available for map display.</p>}
        </div>
      </section>
    </Layout>
  );
}
