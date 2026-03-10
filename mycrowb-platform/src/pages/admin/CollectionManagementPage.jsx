import { useEffect, useMemo, useState } from 'react';
import client from '../../api/client';
import Layout from '../../components/layout/Layout';

const monthOptions = [
  { key: 'jan', label: 'January', value: 1 },
  { key: 'feb', label: 'February', value: 2 },
  { key: 'mar', label: 'March', value: 3 },
  { key: 'apr', label: 'April', value: 4 },
  { key: 'may', label: 'May', value: 5 },
  { key: 'jun', label: 'June', value: 6 },
  { key: 'jul', label: 'July', value: 7 },
  { key: 'aug', label: 'August', value: 8 },
  { key: 'sep', label: 'September', value: 9 },
  { key: 'oct', label: 'October', value: 10 },
  { key: 'nov', label: 'November', value: 11 },
  { key: 'dec', label: 'December', value: 12 }
];

const defaultSummary = { pending: 0, collected: 0, missed: 0 };

export default function CollectionManagementPage() {
  const currentDate = new Date();
  const [rows, setRows] = useState([]);
  const [clusterOptions, setClusterOptions] = useState([]);
  const [clusterScope, setClusterScope] = useState('ALL');
  const [clusterName, setClusterName] = useState('');
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [sortField, setSortField] = useState('shopName');
  const [sortOrder, setSortOrder] = useState('asc');
  const [summary, setSummary] = useState(defaultSummary);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadCollectionData = async () => {
    setLoading(true);
    try {
      const response = await client.get('/collections/admin/payments', {
        params: {
          year,
          clusterName: clusterScope === 'REGISTERED' ? clusterName || undefined : undefined
        }
      });

      const list = response.data.rows || [];
      setRows(list);
      setClusterOptions(response.data.filters?.clusterOptions || []);

      const monthKey = monthOptions.find((item) => item.value === Number(month))?.key;
      const derivedSummary = list.reduce(
        (acc, row) => {
          const monthData = row.months?.[monthKey];
          if (!monthData) {
            acc.pending += 1;
            return acc;
          }

          if (monthData.collected) {
            acc.collected += 1;
          } else if (monthData.status === 'MISSED') {
            acc.missed += 1;
          } else {
            acc.pending += 1;
          }

          return acc;
        },
        { ...defaultSummary }
      );

      setSummary({
        pending: response.data.summary?.pending ?? derivedSummary.pending,
        collected: response.data.summary?.collected ?? derivedSummary.collected,
        missed: response.data.summary?.missed ?? derivedSummary.missed
      });
    } catch (_error) {
      setMessage('Unable to load collection data from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollectionData();
  }, [clusterScope, clusterName, month, year]);

  const selectedMonthKey = monthOptions.find((item) => item.value === Number(month))?.key;

  const tableRows = useMemo(() => {
    const mappedRows = rows.map((row) => {
      const monthData = row.months?.[selectedMonthKey] || null;
      const collectionStatus = monthData?.collected ? 'Collected' : monthData?.status === 'MISSED' ? 'Missed' : 'Pending';
      const paymentStatus = monthData?.paid ? 'Paid' : 'Unpaid';
      return {
        id: row.id,
        shopRegistrationNumber: row.shopRegistrationNumber || '-',
        shopName: row.shopName || '-',
        ownerName: row.ownerName || '-',
        whatsappNumber: row.whatsappNumber || '-',
        collectionStatus,
        paymentStatus,
        monthValue: monthData?.month,
        verified: Boolean(monthData?.paid)
      };
    });

    return mappedRows.sort((a, b) => {
      const left = (a[sortField] ?? '').toString().toLowerCase();
      const right = (b[sortField] ?? '').toString().toLowerCase();
      return sortOrder === 'asc' ? left.localeCompare(right) : right.localeCompare(left);
    });
  }, [rows, selectedMonthKey, sortField, sortOrder]);

  const verifyCollection = async (row) => {
    if (!row.monthValue) {
      setMessage('This row has no collection record for the selected month.');
      return;
    }

    try {
      await client.patch(`/collections/admin/payments/${row.id}/${row.monthValue}/verify`, { year });
      setMessage('Verified successfully. Receipt generated and notification sent to the shop dashboard.');
      loadCollectionData();
    } catch (_error) {
      setMessage('Unable to verify this row.');
    }
  };

  const setSorting = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortOrder('asc');
  };

  return (
    <Layout title="Collection Management">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <p className="text-gray-700">Monitor pending, collected, and missed pickups from database records.</p>

        <div className="mt-4 grid gap-2 text-sm text-gray-700 sm:grid-cols-3">
          <div className="rounded-md bg-lightGreen/40 p-3">Pending: {summary.pending}</div>
          <div className="rounded-md bg-lightGreen/40 p-3">Collected: {summary.collected}</div>
          <div className="rounded-md bg-lightGreen/40 p-3">Missed: {summary.missed}</div>
        </div>

        <div className="mt-4 grid gap-3 rounded-lg border border-gray-200 p-3 md:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs uppercase text-gray-600" htmlFor="cluster-scope">Cluster scope</label>
            <select
              id="cluster-scope"
              className="w-full rounded border border-gray-300 px-2 py-1"
              value={clusterScope}
              onChange={(event) => {
                setClusterScope(event.target.value);
                if (event.target.value === 'ALL') setClusterName('');
              }}
            >
              <option value="REGISTERED">Registered clusters</option>
              <option value="ALL">All clusters</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase text-gray-600" htmlFor="cluster-filter">Cluster</label>
            <select
              id="cluster-filter"
              className="w-full rounded border border-gray-300 px-2 py-1"
              value={clusterName}
              onChange={(event) => setClusterName(event.target.value)}
              disabled={clusterScope !== 'REGISTERED'}
            >
              <option value="">Select cluster</option>
              {clusterOptions.map((cluster) => (
                <option key={cluster} value={cluster}>{cluster}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase text-gray-600" htmlFor="month-filter">Month</label>
            <select
              id="month-filter"
              className="w-full rounded border border-gray-300 px-2 py-1"
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
            >
              {monthOptions.map((item) => (
                <option key={item.key} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase text-gray-600" htmlFor="year-filter">Year</label>
            <input
              id="year-filter"
              type="number"
              className="w-full rounded border border-gray-300 px-2 py-1"
              value={year}
              onChange={(event) => setYear(Number(event.target.value) || currentDate.getFullYear())}
            />
          </div>
        </div>

        {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs uppercase text-gray-600">
                <th className="p-2"><button type="button" onClick={() => setSorting('shopRegistrationNumber')}>Shop Reg Number</button></th>
                <th className="p-2"><button type="button" onClick={() => setSorting('shopName')}>Shop Name</button></th>
                <th className="p-2"><button type="button" onClick={() => setSorting('ownerName')}>Owner Name</button></th>
                <th className="p-2"><button type="button" onClick={() => setSorting('whatsappNumber')}>WhatsApp Number</button></th>
                <th className="p-2"><button type="button" onClick={() => setSorting('collectionStatus')}>Waste Collection Status</button></th>
                <th className="p-2"><button type="button" onClick={() => setSorting('paymentStatus')}>Payment</button></th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {!loading && tableRows.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="p-2">{row.shopRegistrationNumber}</td>
                  <td className="p-2">{row.shopName}</td>
                  <td className="p-2">{row.ownerName}</td>
                  <td className="p-2">{row.whatsappNumber}</td>
                  <td className="p-2">{row.collectionStatus}</td>
                  <td className="p-2">{row.paymentStatus}</td>
                  <td className="p-2">
                    {row.verified ? (
                      <span className="text-xs text-green-700">Verified</span>
                    ) : (
                      <button
                        type="button"
                        className="rounded bg-primaryGreen px-2 py-1 text-xs text-white"
                        onClick={() => verifyCollection(row)}
                      >
                        Verify
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <p className="p-3 text-sm text-gray-600">Loading collection rows...</p>}
          {!loading && !tableRows.length && <p className="p-3 text-sm text-gray-600">No collection rows found for the selected filters.</p>}
        </div>
      </section>
    </Layout>
  );
}
