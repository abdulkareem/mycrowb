import { useEffect, useState } from 'react';
import client from '../../api/client';
import Layout from '../../components/layout/Layout';

const sortOptions = [
  'shopName',
  'ownerName',
  'category',
  'clusterName',
  'roomNumber',
  'buildingNumber',
  'wardNumber',
  'localBody',
  'place',
  'address',
  'district',
  'registeredAssociationName',
  'state',
  'whatsappNumber',
  'employeeCount',
  'chairCount',
  'latitude',
  'longitude',
  'status'
];

const categoryLabel = {
  GENTS_BARBER_SHOP_SALOON: 'Gents barber shop / saloon',
  LADY_BEAUTY_PARLOUR: 'Lady beauty parlour',
  MIXED_LARGE_CORPORATE: 'Mixed / large / corporate'
};

export default function RegisteredShopsPage() {
  const [shops, setShops] = useState([]);
  const [sortField, setSortField] = useState('shopName');
  const [sortOrder, setSortOrder] = useState('asc');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const loadShops = async () => {
    setLoading(true);
    try {
      const response = await client.get('/shops', { params: { sortField, sortOrder } });
      setShops(response.data || []);
    } catch (_error) {
      setMessage('Unable to load registered shops.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShops();
  }, [sortField, sortOrder]);

  const toggleStatus = async (shop) => {
    try {
      await client.patch(`/shops/${shop.id}/toggle`, { active: shop.status !== 'ACTIVE' });
      setMessage(`Shop "${shop.shopName}" is now ${shop.status === 'ACTIVE' ? 'inactive' : 'active'}.`);
      loadShops();
    } catch (_error) {
      setMessage('Unable to update shop status.');
    }
  };

  const issueCertificate = async (shopId) => {
    try {
      await client.post('/certificates', { shopId, certificateType: 'SPECIAL' });
      setMessage('Certificate issued successfully. Shop owner can download it from dashboard.');
    } catch (_error) {
      setMessage('Unable to issue certificate.');
    }
  };

  return (
    <Layout title="Registered Shops">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <p className="text-gray-700">Manage shop data, activation status, and certificate issuance.</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="text-sm text-gray-600" htmlFor="sortField">Sort field</label>
          <select id="sortField" className="rounded-md border border-gray-300 px-2 py-1" value={sortField} onChange={(event) => setSortField(event.target.value)}>
            {sortOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <select className="rounded-md border border-gray-300 px-2 py-1" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
            <option value="asc">A → Z</option>
            <option value="desc">Z → A</option>
          </select>
        </div>

        {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs uppercase text-gray-600">
                <th className="p-2">Shop Name</th>
                <th className="p-2">Owner Name</th>
                <th className="p-2">Category</th>
                <th className="p-2">Cluster Name</th>
                <th className="p-2">Room No</th>
                <th className="p-2">Building No</th>
                <th className="p-2">Ward No</th>
                <th className="p-2">Local Body</th>
                <th className="p-2">Place</th>
                <th className="p-2">Address</th>
                <th className="p-2">District</th>
                <th className="p-2">Association</th>
                <th className="p-2">State</th>
                <th className="p-2">WhatsApp</th>
                <th className="p-2">Employees</th>
                <th className="p-2">Chairs</th>
                <th className="p-2">Latitude</th>
                <th className="p-2">Longitude</th>
                <th className="p-2">Status</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && shops.map((shop) => (
                <tr key={shop.id} className="border-b align-top">
                  <td className="p-2">{shop.shopName}</td>
                  <td className="p-2">{shop.ownerName || shop.owner?.name || '-'}</td>
                  <td className="p-2">{categoryLabel[shop.category] || '-'}</td>
                  <td className="p-2">{shop.clusterName || '-'}</td>
                  <td className="p-2">{shop.roomNumber || '-'}</td>
                  <td className="p-2">{shop.buildingNumber || '-'}</td>
                  <td className="p-2">{shop.wardNumber || '-'}</td>
                  <td className="p-2">{shop.localBody || '-'}</td>
                  <td className="p-2">{shop.place || '-'}</td>
                  <td className="p-2">{shop.address || '-'}</td>
                  <td className="p-2">{shop.district || '-'}</td>
                  <td className="p-2">{shop.registeredAssociationName || '-'}</td>
                  <td className="p-2">{shop.state || '-'}</td>
                  <td className="p-2">{shop.whatsappNumber || '-'}</td>
                  <td className="p-2">{shop.employeeCount ?? '-'}</td>
                  <td className="p-2">{shop.chairCount ?? '-'}</td>
                  <td className="p-2">{shop.latitude ?? '-'}</td>
                  <td className="p-2">{shop.longitude ?? '-'}</td>
                  <td className="p-2">{shop.status}</td>
                  <td className="p-2">
                    <div className="flex flex-col gap-2">
                      <button className="rounded-md border border-primaryGreen px-2 py-1 text-xs text-primaryGreen" onClick={() => toggleStatus(shop)} type="button">
                        {shop.status === 'ACTIVE' ? 'Inactivate' : 'Activate'}
                      </button>
                      <button className="rounded-md bg-primaryGreen px-2 py-1 text-xs text-white" onClick={() => issueCertificate(shop.id)} type="button">
                        Issue certificate
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <p className="p-3 text-sm text-gray-600">Loading shops...</p>}
          {!loading && !shops.length && <p className="p-3 text-sm text-gray-600">No shops found.</p>}
        </div>
      </section>
    </Layout>
  );
}
