import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import ShopMap from '../../components/map/ShopMap';
import client from '../../api/client';
import { downloadCsv } from '../../utils/exportCsv';

const STAFF_ASSIGNMENT_KEY = 'mycrowb_staff_route_assignments';
const BARBER_NOTIFICATION_KEY = 'mycrowb_barber_notifications';

const normalizeCluster = (value = '') => value.trim().toLowerCase();

const isValidCoordinate = (latitude, longitude) => {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

const readAssignments = () => {
  const rawAssignments = JSON.parse(localStorage.getItem(STAFF_ASSIGNMENT_KEY) || '{}');
  return Object.values(rawAssignments || {}).filter(Boolean);
};

export default function RouteOptimizationPage() {
  const [staffList, setStaffList] = useState([]);
  const [shops, setShops] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedCluster, setSelectedCluster] = useState('');
  const [collectionDate, setCollectionDate] = useState('');
  const [sentAssignmentsByStaffId, setSentAssignmentsByStaffId] = useState({});
  const [message, setMessage] = useState('');

  const refreshSentAssignments = () => {
    const byStaffId = readAssignments().reduce((acc, assignment) => {
      if (!assignment.staffIdNumber) return acc;
      if (!acc[assignment.staffIdNumber]) acc[assignment.staffIdNumber] = [];
      acc[assignment.staffIdNumber].push(assignment);
      return acc;
    }, {});
    setSentAssignmentsByStaffId(byStaffId);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [staffResponse, shopResponse] = await Promise.all([client.get('/staff'), client.get('/shops')]);
        setStaffList(staffResponse.data || []);
        setShops(shopResponse.data || []);
        refreshSentAssignments();
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

  const selectedStaff = useMemo(
    () => staffList.find((staff) => String(staff.staffIdNumber || staff.id) === selectedStaffId),
    [selectedStaffId, staffList]
  );

  const clusterShops = useMemo(() => {
    if (!selectedCluster) return [];
    return shops.filter((shop) => normalizeCluster(shop.clusterName) === normalizeCluster(selectedCluster));
  }, [selectedCluster, shops]);

  const mapShops = useMemo(
    () => clusterShops
      .filter((shop) => isValidCoordinate(shop.latitude, shop.longitude))
      .map((shop) => ({
        id: shop.id,
        shopName: shop.shopName,
        ownerName: shop.ownerName,
        clusterName: shop.clusterName,
        latitude: Number(shop.latitude),
        longitude: Number(shop.longitude),
        status: 'pending'
      })),
    [clusterShops]
  );

  const handleExportShops = () => {
    const rows = clusterShops.map((shop, index) => ({
      serialNumber: index + 1,
      shopRegistrationNumber: shop.shopRegistrationNumber || '-',
      ownerName: shop.ownerName || '-',
      shopName: shop.shopName || '-',
      place: shop.place || '-',
      whatsappNumber: shop.whatsappNumber || '-',
      pendingPayment: shop.paymentPendingMonths ?? '-',
      lastCollectedDate: shop.lastCollectionDate ? new Date(shop.lastCollectionDate).toLocaleDateString() : '-'
    }));

    downloadCsv(`cluster-${selectedCluster || 'shops'}.csv`, [
      { key: 'serialNumber', header: 'S.No' },
      { key: 'shopRegistrationNumber', header: 'Shop Reg Number' },
      { key: 'ownerName', header: 'Owner Name' },
      { key: 'shopName', header: 'Shop Name' },
      { key: 'place', header: 'Place' },
      { key: 'whatsappNumber', header: 'WhatsApp Number' },
      { key: 'pendingPayment', header: 'Pending Payment' },
      { key: 'lastCollectedDate', header: 'Last Collected Date' }
    ], rows);

    setMessage('Shop list exported successfully.');
  };

  const handleSendToStaff = () => {
    if (!selectedStaff || !selectedCluster || !collectionDate) {
      setMessage('Please select staff ID, cluster, and collection date before sending.');
      return;
    }

    const assignments = JSON.parse(localStorage.getItem(STAFF_ASSIGNMENT_KEY) || '{}');
    const routeDate = collectionDate ? new Date(collectionDate) : new Date();
    const collectionMonth = routeDate.getMonth() + 1;
    const collectionYear = routeDate.getFullYear();

    const assignmentId = `${selectedStaff.staffIdNumber}-${collectionDate}-${Date.now()}`;

    assignments[assignmentId] = {
      id: assignmentId,
      staffIdNumber: selectedStaff.staffIdNumber,
      staffName: selectedStaff.name,
      staffMobileNumber: selectedStaff.mobileNumber,
      vehicleNumber: selectedStaff.vehicleNumber,
      clusterName: selectedCluster,
      date: collectionDate,
      shops: clusterShops.map((shop) => {
        const tippingFees = Number(shop.tippingFees || 0);
        const gstPercentage = Number(shop.gstPercentage ?? 18);
        const gst = Number(((tippingFees * gstPercentage) / 100).toFixed(2));
        const total = Number((tippingFees + gst).toFixed(2));

        return {
          id: shop.id,
          shopRegistrationNumber: shop.shopRegistrationNumber,
          shopName: shop.shopName,
          ownerName: shop.ownerName,
          place: shop.place,
          whatsappNumber: shop.whatsappNumber,
          tippingFees,
          gstPercentage,
          gst,
          total,
          moneyCollected: total,
          latitude: Number(shop.latitude),
          longitude: Number(shop.longitude),
          collectionMonth,
          collectionYear
        };
      }),
      sentAt: new Date().toISOString()
    };
    localStorage.setItem(STAFF_ASSIGNMENT_KEY, JSON.stringify(assignments));
    refreshSentAssignments();

    const notifications = JSON.parse(localStorage.getItem(BARBER_NOTIFICATION_KEY) || '[]');
    const nextNotifications = [
      ...notifications,
      ...clusterShops.map((shop) => ({
        id: `${shop.id}-${Date.now()}-${Math.random()}`,
        shopId: shop.id,
        shopName: shop.shopName,
        clusterName: selectedCluster,
        date: collectionDate,
        message: `Hair collection from your shop is scheduled on ${collectionDate}.`,
        createdAt: new Date().toISOString()
      }))
    ];
    localStorage.setItem(BARBER_NOTIFICATION_KEY, JSON.stringify(nextNotifications));

    setMessage(`Route sent to ${selectedStaff.name}. Notifications prepared for ${clusterShops.length} shops.`);
  };

  const sentRouteCount = selectedStaff?.staffIdNumber ? (sentAssignmentsByStaffId[selectedStaff.staffIdNumber]?.length || 0) : 0;

  return (
    <Layout title="Route Optimization Dashboard">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-gray-700">Select staff and cluster, then send collection routes and notifications.</p>
          <Link className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700" to="/admin/overview">← Back</Link>
        </div>

        {message && <p className="mb-4 rounded-md bg-gray-50 p-2 text-sm text-gray-700">{message}</p>}

        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm text-gray-700" htmlFor="staff-select">Staff ID</label>
            <select id="staff-select" className="w-full rounded-md border border-gray-300 px-2 py-1" value={selectedStaffId} onChange={(event) => setSelectedStaffId(event.target.value)}>
              <option value="">Select staff</option>
              {staffList.map((staff) => {
                const staffKey = String(staff.staffIdNumber || staff.id);
                return <option key={staff.id} value={staffKey}>{staff.staffIdNumber} - {staff.name}</option>;
              })}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700" htmlFor="cluster-select">Cluster</label>
            <select id="cluster-select" className="w-full rounded-md border border-gray-300 px-2 py-1" value={selectedCluster} onChange={(event) => setSelectedCluster(event.target.value)}>
              <option value="">Select cluster</option>
              {allClusters.map((cluster) => <option key={cluster} value={cluster}>{cluster}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700" htmlFor="collection-date">Collection date</label>
            <input id="collection-date" type="date" className="w-full rounded-md border border-gray-300 px-2 py-1" value={collectionDate} onChange={(event) => setCollectionDate(event.target.value)} />
          </div>

          <div className="flex items-end gap-2">
            <button type="button" className="rounded-md border border-gray-300 px-3 py-2 text-xs" onClick={handleExportShops} disabled={!clusterShops.length}>Import as Excel Sheet</button>
            <button type="button" className="rounded-md bg-primaryGreen px-3 py-2 text-xs font-medium text-white" onClick={handleSendToStaff}>
              {sentRouteCount ? `Send another route (${sentRouteCount} sent)` : 'Send to staff'}
            </button>
          </div>
        </div>

        {selectedStaff && (
          <div className="mt-4 rounded-lg border border-gray-200 p-3 text-sm text-gray-700">
            <p><strong>Staff:</strong> {selectedStaff.name} ({selectedStaff.staffIdNumber})</p>
            <p><strong>Mobile:</strong> {selectedStaff.mobileNumber || '-'} | <strong>WhatsApp:</strong> {selectedStaff.whatsappNumber || '-'}</p>
            <p><strong>Vehicle:</strong> {selectedStaff.vehicleNumber || '-'} | <strong>Status:</strong> {selectedStaff.isActive ? 'Active' : 'Inactive'}</p>
          </div>
        )}

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2">S.No</th>
                <th className="p-2">Shop Reg Number</th>
                <th className="p-2">Owner Name</th>
                <th className="p-2">Shop Name</th>
                <th className="p-2">Place</th>
                <th className="p-2">WhatsApp Number</th>
                <th className="p-2">Pending Payment</th>
                <th className="p-2">Last Collected Date</th>
              </tr>
            </thead>
            <tbody>
              {clusterShops.map((shop, index) => (
                <tr className="border-b border-gray-200" key={shop.id}>
                  <td className="p-2">{index + 1}</td>
                  <td className="p-2">{shop.shopRegistrationNumber || '-'}</td>
                  <td className="p-2">{shop.ownerName || '-'}</td>
                  <td className="p-2">{shop.shopName || '-'}</td>
                  <td className="p-2">{shop.place || '-'}</td>
                  <td className="p-2">{shop.whatsappNumber || '-'}</td>
                  <td className="p-2">{shop.paymentPendingMonths ?? '-'}</td>
                  <td className="p-2">{shop.lastCollectionDate ? new Date(shop.lastCollectionDate).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
              {!clusterShops.length && (
                <tr>
                  <td className="p-4 text-center text-gray-500" colSpan="8">Select a cluster to view shops.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <h2 className="mb-2 text-base font-semibold text-gray-800">Shop locations map</h2>
          {!!mapShops.length && <ShopMap shops={mapShops} />}
          {!selectedCluster && <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-500">Select a cluster to view map data.</p>}
          {!!selectedCluster && !mapShops.length && <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-500">No valid latitude/longitude is available for this cluster.</p>}
        </div>
      </section>
    </Layout>
  );
}
