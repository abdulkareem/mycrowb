import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import Layout from '../../components/layout/Layout';

const categoryLabel = {
  GENTS_BARBER_SHOP_SALOON: 'Gents hair stylist shop / saloon',
  LADY_BEAUTY_PARLOUR: 'Lady beauty parlour',
  MIXED_LARGE_CORPORATE: 'Mixed / large / corporate'
};

const frequencyLabel = {
  MONTHLY_ONCE: 'Monthly once',
  MONTHLY_TWICE: 'Monthly twice',
  WEEKLY: 'Weekly'
};

const editableFields = [
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
  'joinedDate',
  'tippingFees',
  'gstPercentage',
  'collectionFrequency',
  'paymentPendingMonths'
];

const headers = [
  { key: 'shopRegistrationNumber', label: 'Shop Registration Number' },
  { key: 'shopName', label: 'Shop Name' },
  { key: 'ownerName', label: 'Owner Name' },
  { key: 'category', label: 'Category' },
  { key: 'whatsappNumber', label: 'WhatsApp' },
  { key: 'clusterName', label: 'Cluster Name' },
  { key: 'place', label: 'Place' },
  { key: 'roomNumber', label: 'Room No' },
  { key: 'buildingNumber', label: 'Building No' },
  { key: 'wardNumber', label: 'Ward No' },
  { key: 'localBody', label: 'Local Body' },
  { key: 'district', label: 'District' },
  { key: 'state', label: 'State' },
  { key: 'address', label: 'Address' },
  { key: 'registeredAssociationName', label: 'Association' },
  { key: 'latitude', label: 'Latitude' },
  { key: 'longitude', label: 'Longitude' },
  { key: 'joinedDate', label: 'Joined Date' },
  { key: 'employeeCount', label: 'Employees' },
  { key: 'chairCount', label: 'Chairs' },
  { key: 'tippingFees', label: 'Tipping Fees' },
  { key: 'gstPercentage', label: 'GST %' },
  { key: 'collectionFrequency', label: 'Collection Frequency' },
  { key: 'paymentPendingMonths', label: 'Pending Months' },
  { key: 'status', label: 'Status' }
];

export default function RegisteredShopsPage() {
  const navigate = useNavigate();
  const [shops, setShops] = useState([]);
  const [sortField, setSortField] = useState('shopName');
  const [sortOrder, setSortOrder] = useState('asc');
  const [editingId, setEditingId] = useState(null);
  const [draftRow, setDraftRow] = useState({});
  const [exportFilters, setExportFilters] = useState({ clusterName: '', place: '', localBody: '', status: '' });
  const [appliedFilters, setAppliedFilters] = useState({ clusterName: '', place: '', localBody: '', status: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [filterOptions, setFilterOptions] = useState({ clusterNames: [], places: [], localBodies: [] });

  const uniqueSorted = (values) => [...new Set(values.filter(Boolean).map((value) => value.trim()))].sort((a, b) => a.localeCompare(b));

  const loadShops = async (filters = appliedFilters) => {
    setLoading(true);
    try {
      const response = await client.get('/shops', { params: { sortField, sortOrder, ...filters } });
      setShops(response.data || []);
    } catch (_error) {
      setMessage('Unable to load registered shops.');
    } finally {
      setLoading(false);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const response = await client.get('/shops', {
        params: {
          sortField: 'shopName',
          sortOrder: 'asc'
        }
      });
      const shopsList = response.data || [];
      setFilterOptions({
        clusterNames: uniqueSorted(shopsList.map((shop) => shop.clusterName)),
        places: uniqueSorted(shopsList.map((shop) => shop.place)),
        localBodies: uniqueSorted(shopsList.map((shop) => shop.localBody))
      });
    } catch (_error) {
      setFilterOptions({ clusterNames: [], places: [], localBodies: [] });
    }
  };

  useEffect(() => {
    loadShops(appliedFilters);
  }, [sortField, sortOrder, appliedFilters]);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const handleSort = (field, order) => {
    setSortField(field);
    setSortOrder(order);
  };

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
      const response = await client.post('/certificates', { shopId, certificateType: 'SPECIAL' });
      setMessage(`Certificate issued successfully. Code: ${response.data.certificateCode}`);
      loadShops();
    } catch (_error) {
      setMessage('Unable to issue certificate.');
    }
  };

  const cancelCertificate = async (shopId) => {
    try {
      const response = await client.delete(`/certificates/shop/${shopId}`);
      setMessage(`Certificate cancelled successfully. Deleted code: ${response.data.deletedCertificateCode}`);
      loadShops();
    } catch (_error) {
      setMessage('Unable to cancel certificate.');
    }
  };

  const startEdit = (shop) => {
    setEditingId(shop.id);
    setDraftRow({
      ...shop,
      joinedDate: shop.joinedDate ? shop.joinedDate.slice(0, 10) : ''
    });
  };

  const saveEdit = async (shopId) => {
    const payload = {};
    editableFields.forEach((field) => {
      payload[field] = draftRow[field] ?? null;
    });

    try {
      await client.patch(`/shops/${shopId}`, payload);
      setMessage('Shop details saved successfully.');
      setEditingId(null);
      setDraftRow({});
      loadShops();
    } catch (_error) {
      setMessage('Unable to save shop details.');
    }
  };


  const deleteShop = async (shop) => {
    try {
      await client.delete(`/shops/${shop.id}`);
      setMessage(`Shop "${shop.shopName}" deleted successfully.`);
      loadShops();
    } catch (_error) {
      setMessage('Unable to delete shop.');
    }
  };

  const downloadExcel = async () => {
    try {
      const response = await client.get('/shops/export', {
        params: exportFilters,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'registered-shops.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage('Export downloaded successfully.');
    } catch (_error) {
      setMessage('Unable to download export.');
    }
  };

  const filterList = () => {
    setAppliedFilters({ ...exportFilters });
  };

  const renderCell = (shop, field) => {
    const isEditing = editingId === shop.id;
    if (!isEditing || field === 'status' || !editableFields.includes(field)) {
      if (field === 'category') return categoryLabel[shop.category] || '-';
      if (field === 'collectionFrequency') return frequencyLabel[shop.collectionFrequency] || '-';
      if (field === 'joinedDate') return shop.joinedDate ? new Date(shop.joinedDate).toLocaleDateString() : '-';
      if (field === 'paymentPendingMonths') {
        const pendingMonths = Number(shop.paymentPendingMonths || 0);
        return <span className={pendingMonths >= 3 ? 'font-semibold text-red-600' : ''}>{pendingMonths}</span>;
      }
      return shop[field] ?? '-';
    }

    if (field === 'category') {
      return (
        <select
          className="w-36 rounded border border-gray-300 px-1 py-1"
          value={draftRow.category || ''}
          onChange={(event) => setDraftRow((prev) => ({ ...prev, category: event.target.value || null }))}
        >
          <option value="">-</option>
          {Object.entries(categoryLabel).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      );
    }


    if (field === 'collectionFrequency') {
      return (
        <select
          className="w-36 rounded border border-gray-300 px-1 py-1"
          value={draftRow.collectionFrequency || 'MONTHLY_ONCE'}
          onChange={(event) => setDraftRow((prev) => ({ ...prev, collectionFrequency: event.target.value }))}
        >
          {Object.entries(frequencyLabel).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      );
    }

    const type = field === 'joinedDate' ? 'date' : 'text';
    return (
      <input
        type={type}
        value={draftRow[field] ?? ''}
        onChange={(event) => setDraftRow((prev) => ({ ...prev, [field]: event.target.value }))}
        className="w-36 rounded border border-gray-300 px-1 py-1"
      />
    );
  };

  return (
    <Layout title="Registered Shops">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <p className="text-gray-700">Manage shop data, activation status, and certificate issuance.</p>

        <div className="mt-4 grid gap-2 rounded-lg border border-gray-200 p-3 md:grid-cols-6">
          <input list="cluster-options" className="rounded-md border border-gray-300 px-2 py-1" placeholder="Cluster" value={exportFilters.clusterName} onChange={(event) => setExportFilters((prev) => ({ ...prev, clusterName: event.target.value }))} />
          <datalist id="cluster-options">
            {filterOptions.clusterNames.map((cluster) => (
              <option key={cluster} value={cluster} />
            ))}
          </datalist>
          <input list="place-options" className="rounded-md border border-gray-300 px-2 py-1" placeholder="Place" value={exportFilters.place} onChange={(event) => setExportFilters((prev) => ({ ...prev, place: event.target.value }))} />
          <datalist id="place-options">
            {filterOptions.places.map((place) => (
              <option key={place} value={place} />
            ))}
          </datalist>
          <input list="local-body-options" className="rounded-md border border-gray-300 px-2 py-1" placeholder="Local body" value={exportFilters.localBody} onChange={(event) => setExportFilters((prev) => ({ ...prev, localBody: event.target.value }))} />
          <datalist id="local-body-options">
            {filterOptions.localBodies.map((localBody) => (
              <option key={localBody} value={localBody} />
            ))}
          </datalist>
          <select className="rounded-md border border-gray-300 px-2 py-1" value={exportFilters.status} onChange={(event) => setExportFilters((prev) => ({ ...prev, status: event.target.value }))}>
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <button className="rounded-md border border-primaryGreen px-2 py-1 text-primaryGreen" onClick={filterList} type="button">Filter List</button>
          <button className="rounded-md bg-primaryGreen px-2 py-1 text-white" onClick={downloadExcel} type="button">Download Excel</button>
        </div>

        {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs uppercase text-gray-600">
                {headers.map((header) => (
                  <th key={header.key} className="p-2">
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      <span>{header.label}</span>
                      <button type="button" className="text-gray-500" onClick={() => handleSort(header.key, 'asc')}>↑</button>
                      <button type="button" className="text-gray-500" onClick={() => handleSort(header.key, 'desc')}>↓</button>
                    </div>
                  </th>
                ))}
                <th className="p-2">Certificate</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && shops.map((shop) => (
                <tr key={shop.id} className={`border-b align-top ${Number(shop.paymentPendingMonths || 0) >= 3 ? 'bg-red-50' : ''}`}>
                  {headers.map((header) => (
                    <td key={`${shop.id}-${header.key}`} className="p-2">{renderCell(shop, header.key)}</td>
                  ))}
                  <td className="p-2">{shop.certificates?.[0]?.certificateCode || '-'}</td>
                  <td className="p-2">
                    <div className="flex flex-col gap-2">
                      <button className="rounded-md border border-primaryGreen px-2 py-1 text-xs text-primaryGreen" onClick={() => toggleStatus(shop)} type="button">
                        {shop.status === 'ACTIVE' ? 'Inactivate' : 'Activate'}
                      </button>
                      {editingId === shop.id ? (
                        <button className="rounded-md bg-primaryGreen px-2 py-1 text-xs text-white" onClick={() => saveEdit(shop.id)} type="button">Save</button>
                      ) : (
                        <button className="rounded-md border border-gray-400 px-2 py-1 text-xs text-gray-700" onClick={() => startEdit(shop)} type="button">Edit</button>
                      )}
                      <button className="rounded-md bg-primaryGreen px-2 py-1 text-xs text-white" onClick={() => issueCertificate(shop.id)} type="button">
                        Issue certificate
                      </button>
                      <button className="rounded-md border border-red-400 px-2 py-1 text-xs text-red-600" onClick={() => cancelCertificate(shop.id)} type="button">
                        Cancel certificate
                      </button>
                      <button className="rounded-md bg-red-600 px-2 py-1 text-xs text-white" onClick={() => deleteShop(shop)} type="button">
                        Delete
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

        <div className="mt-6">
          <button type="button" onClick={() => navigate(-1)} className="rounded-md border border-gray-400 px-3 py-2 text-sm text-gray-700">
            Back
          </button>
        </div>
      </section>
    </Layout>
  );
}
