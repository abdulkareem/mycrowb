import { Fragment, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import ShopMap from '../../components/map/ShopMap';
import client from '../../api/client';

const STAFF_ASSIGNMENT_KEY = 'mycrowb_staff_route_assignments';
const STAFF_COLLECTION_KEY = 'mycrowb_staff_collection_updates';

const DEFAULT_ROUTE_META = {
  vehicleNumber: 'kl10au2323',
  clusterName: 'Tirurangadi',
  date: '2026-03-26'
};

const isValidCoordinate = (latitude, longitude) => {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

const getShopCharges = (shop) => {
  const tippingFee = Number(shop.tippingFees || 0);
  const gst = Number(shop.gst ?? ((tippingFee * Number(shop.gstPercentage ?? 18)) / 100).toFixed(2));
  return {
    tippingFee,
    gst,
    total: Number((tippingFee + gst).toFixed(2))
  };
};

export default function TodayRoutePage() {
  const navigate = useNavigate();
  const [expandedRowId, setExpandedRowId] = useState('');
  const [message, setMessage] = useState('');

  const route = useMemo(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const assignments = JSON.parse(localStorage.getItem(STAFF_ASSIGNMENT_KEY) || '{}');
    const allAssignments = Object.values(assignments);

    const byUserStaffId = allAssignments.find((assignment) => assignment.staffIdNumber === user?.staffIdNumber);
    return byUserStaffId || allAssignments[0] || null;
  }, []);

  const [collectionByShopId, setCollectionByShopId] = useState(() => JSON.parse(localStorage.getItem(STAFF_COLLECTION_KEY) || '{}'));

  const mapShops = useMemo(
    () => (route?.shops || [])
      .filter((shop) => isValidCoordinate(shop.latitude, shop.longitude))
      .map((shop) => ({
        ...shop,
        latitude: Number(shop.latitude),
        longitude: Number(shop.longitude),
        status: collectionByShopId[shop.id]?.status === 'collected' ? 'collected' : 'pending'
      })),
    [route, collectionByShopId]
  );

  const staffLocation = useMemo(() => {
    const latest = Object.values(collectionByShopId)
      .filter((item) => isValidCoordinate(item?.staffLatitude, item?.staffLongitude) && item?.collectedAt)
      .sort((a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime())[0];

    return latest
      ? { latitude: Number(latest.staffLatitude), longitude: Number(latest.staffLongitude) }
      : null;
  }, [collectionByShopId]);

  const stats = useMemo(() => {
    const shops = route?.shops || [];
    const now = new Date();

    const routeTotals = shops.reduce((acc, shop) => {
      const status = collectionByShopId[shop.id]?.status || 'pending';
      if (status === 'collected') acc.collected += 1;
      else if (status === 'missed') acc.missed += 1;
      else acc.notCollected += 1;
      return acc;
    }, { collected: 0, missed: 0, notCollected: 0 });

    const entries = Object.values(collectionByShopId).filter((item) => item?.status === 'collected' && item?.collectedAt);
    const monthlyCommission = entries
      .filter((item) => {
        const date = new Date(item.collectedAt);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      })
      .reduce((sum, item) => sum + Number(item.tippingFeeCollected || 0), 0);

    const yearlyCommission = entries
      .filter((item) => new Date(item.collectedAt).getFullYear() === now.getFullYear())
      .reduce((sum, item) => sum + Number(item.tippingFeeCollected || 0), 0);

    return {
      ...routeTotals,
      monthlyCommission: Number(monthlyCommission.toFixed(2)),
      yearlyCommission: Number(yearlyCommission.toFixed(2))
    };
  }, [route, collectionByShopId]);

  const updateCollectionLocally = (shopId, patch) => {
    setCollectionByShopId((prev) => {
      const next = { ...prev, [shopId]: { ...(prev[shopId] || {}), ...patch } };
      localStorage.setItem(STAFF_COLLECTION_KEY, JSON.stringify(next));
      return next;
    });
  };

  const getCurrentLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported on this device.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          staffLatitude: position.coords.latitude,
          staffLongitude: position.coords.longitude
        });
      },
      () => reject(new Error('Unable to fetch current location. Please enable location access.')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });

  const handleConfirmCollection = async (shop) => {
    const existing = collectionByShopId[shop.id] || {};
    const { tippingFee, gst } = getShopCharges(shop);
    const hairWeight = Number(existing.hairWeight ?? 10);
    const tippingFeeCollected = Number(existing.tippingFeeCollected ?? tippingFee);
    const gstCollected = Number(existing.gstCollected ?? gst);
    const totalCollected = Number((tippingFeeCollected + gstCollected).toFixed(2));

    if (!Number.isFinite(hairWeight) || hairWeight <= 0) {
      setMessage('Please enter a valid collected weight.');
      return;
    }

    if (!Number.isFinite(tippingFeeCollected) || tippingFeeCollected < 0 || !Number.isFinite(gstCollected) || gstCollected < 0) {
      setMessage('Please enter valid tipping fee and GST values.');
      return;
    }

    try {
      setMessage('Capturing current location and saving confirmation...');
      const { staffLatitude, staffLongitude } = await getCurrentLocation();
      const nowIso = new Date().toISOString();

      updateCollectionLocally(shop.id, {
        status: 'collected',
        hairWeight,
        tippingFeeCollected,
        gstCollected,
        moneyCollected: totalCollected,
        staffLatitude,
        staffLongitude,
        collectedAt: nowIso,
        paymentDate: nowIso
      });

      if (shop.collectionId) {
        await client.patch(`/collections/${shop.collectionId}/collect`, {
          hairWeight,
          tippingFeeCollected,
          gstCollected,
          amount: totalCollected,
          collectionDate: nowIso,
          paymentDate: nowIso,
          staffLatitude,
          staffLongitude
        });
      }

      setExpandedRowId('');
      setMessage(`Collection confirmed for ${shop.shopName}.`);
    } catch (error) {
      setMessage(error?.response?.data?.message || error.message || 'Unable to save confirmation.');
    }
  };

  return (
    <Layout title="Today's Collection Route">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-gray-700">
          Vehicle: {route?.vehicleNumber || DEFAULT_ROUTE_META.vehicleNumber} | Cluster: {route?.clusterName || DEFAULT_ROUTE_META.clusterName} | Date: {route?.date || DEFAULT_ROUTE_META.date}
        </p>

        {message && <p className="mt-3 rounded-md bg-gray-50 p-2 text-sm text-gray-700">{message}</p>}

        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <div className="rounded-lg bg-green-50 p-3 text-sm"><p className="text-gray-600">Collected shops</p><p className="text-xl font-semibold text-green-700">{stats.collected}</p></div>
          <div className="rounded-lg bg-red-50 p-3 text-sm"><p className="text-gray-600">Missed shops</p><p className="text-xl font-semibold text-red-700">{stats.missed}</p></div>
          <div className="rounded-lg bg-yellow-50 p-3 text-sm"><p className="text-gray-600">Not collected</p><p className="text-xl font-semibold text-yellow-700">{stats.notCollected}</p></div>
          <div className="rounded-lg bg-blue-50 p-3 text-sm"><p className="text-gray-600">Commission (this month)</p><p className="text-xl font-semibold text-blue-700">₹{stats.monthlyCommission.toFixed(2)}</p></div>
          <div className="rounded-lg bg-indigo-50 p-3 text-sm"><p className="text-gray-600">Commission (this year)</p><p className="text-xl font-semibold text-indigo-700">₹{stats.yearlyCommission.toFixed(2)}</p></div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[1200px] border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2">S.No</th>
                <th className="p-2">Shop Reg Number</th>
                <th className="p-2">Shop Name</th>
                <th className="p-2">Place</th>
                <th className="p-2">WhatsApp Number</th>
                <th className="p-2">Tipping Fee</th>
                <th className="p-2">GST</th>
                <th className="p-2">Total</th>
                <th className="p-2">Collection Status</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(route?.shops || []).map((shop, index) => {
                const collectionData = collectionByShopId[shop.id] || {};
                const { tippingFee, gst, total } = getShopCharges(shop);
                const isExpanded = expandedRowId === shop.id;

                return (
                  <Fragment key={shop.id}>
                    <tr className="border-b border-gray-200">
                      <td className="p-2">{index + 1}</td>
                      <td className="p-2">{shop.shopRegistrationNumber || '-'}</td>
                      <td className="p-2">{shop.shopName || '-'}</td>
                      <td className="p-2">{shop.place || '-'}</td>
                      <td className="p-2">{shop.whatsappNumber || '-'}</td>
                      <td className="p-2">{tippingFee.toFixed(2)}</td>
                      <td className="p-2">{gst.toFixed(2)}</td>
                      <td className="p-2">{total.toFixed(2)}</td>
                      <td className="p-2">
                        <span className={`rounded px-2 py-1 text-xs ${collectionData.status === 'collected' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {collectionData.status === 'collected' ? 'Collected' : 'Pending'}
                        </span>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <button type="button" className="rounded-md bg-primaryGreen px-2 py-1 text-xs text-white" onClick={() => setExpandedRowId(isExpanded ? '' : shop.id)}>
                            Collection confirmation
                          </button>
                          <button type="button" className="rounded-md border border-gray-300 px-2 py-1 text-xs" onClick={() => navigate(`/staff/shop-map?shopId=${shop.id}`)}>
                            Open shop map
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <td className="p-3" colSpan="10">
                          <div className="grid gap-2 sm:grid-cols-4">
                            <label className="text-xs text-gray-700">
                              Collected weight (kg)
                              <input
                                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                                type="number"
                                step="0.01"
                                value={collectionData.hairWeight ?? 10}
                                onChange={(event) => updateCollectionLocally(shop.id, { hairWeight: event.target.value })}
                              />
                            </label>
                            <label className="text-xs text-gray-700">
                              Tipping fee collected
                              <input
                                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                                type="number"
                                step="0.01"
                                value={collectionData.tippingFeeCollected ?? tippingFee}
                                onChange={(event) => updateCollectionLocally(shop.id, { tippingFeeCollected: event.target.value })}
                              />
                            </label>
                            <label className="text-xs text-gray-700">
                              GST collected
                              <input
                                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                                type="number"
                                step="0.01"
                                value={collectionData.gstCollected ?? gst}
                                onChange={(event) => updateCollectionLocally(shop.id, { gstCollected: event.target.value })}
                              />
                            </label>
                            <div className="flex items-end">
                              <button type="button" className="rounded-md bg-leafGreen px-3 py-2 text-xs font-medium text-white" onClick={() => handleConfirmCollection(shop)}>
                                Confirm and save
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {!route?.shops?.length && (
                <tr>
                  <td className="p-4 text-center text-gray-500" colSpan="10">No route assignment has been sent yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <h2 className="mb-2 text-base font-semibold text-gray-800">Route map (all shops)</h2>
          {mapShops.length ? <ShopMap shops={mapShops} staffLocation={staffLocation} /> : <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-500">No valid shop map data found in this route.</p>}
        </div>
      </section>
    </Layout>
  );
}
