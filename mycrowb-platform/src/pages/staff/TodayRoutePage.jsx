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

const getDefaultAmount = (shop) => {
  if (Number.isFinite(Number(shop.moneyCollected))) return Number(shop.moneyCollected);
  if (Number.isFinite(Number(shop.total))) return Number(shop.total);
  const tippingFee = Number(shop.tippingFees || 0);
  const gstPercentage = Number(shop.gstPercentage ?? 18);
  const gst = (tippingFee * gstPercentage) / 100;
  return Number((tippingFee + gst).toFixed(2));
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
    const hairWeight = Number(existing.hairWeight ?? 10);
    const moneyCollected = Number(existing.moneyCollected ?? getDefaultAmount(shop));

    if (!Number.isFinite(hairWeight) || hairWeight <= 0) {
      setMessage('Please enter a valid collected weight.');
      return;
    }

    if (!Number.isFinite(moneyCollected) || moneyCollected < 0) {
      setMessage('Please enter a valid collected amount.');
      return;
    }

    try {
      setMessage('Capturing current location and saving confirmation...');
      const { staffLatitude, staffLongitude } = await getCurrentLocation();

      updateCollectionLocally(shop.id, {
        status: 'collected',
        hairWeight,
        moneyCollected,
        staffLatitude,
        staffLongitude,
        collectedAt: new Date().toISOString()
      });

      if (shop.collectionId) {
        await client.patch(`/collections/${shop.collectionId}/collect`, {
          hairWeight,
          amount: moneyCollected,
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
                const tippingFee = Number(shop.tippingFees || 0);
                const gst = Number(shop.gst ?? ((tippingFee * Number(shop.gstPercentage ?? 18)) / 100).toFixed(2));
                const total = getDefaultAmount(shop);
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
                          <div className="grid gap-2 sm:grid-cols-3">
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
                              Money collected
                              <input
                                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                                type="number"
                                step="0.01"
                                value={collectionData.moneyCollected ?? total}
                                onChange={(event) => updateCollectionLocally(shop.id, { moneyCollected: event.target.value })}
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
          {mapShops.length ? <ShopMap shops={mapShops} /> : <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-500">No valid shop map data found in this route.</p>}
        </div>
      </section>
    </Layout>
  );
}
