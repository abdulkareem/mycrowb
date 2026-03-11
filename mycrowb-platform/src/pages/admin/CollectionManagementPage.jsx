import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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

  return (
    <Layout title="Collection Management">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-gray-700">Monitor pending, collected, and missed pickups from database records.</p>
          <button type="button" onClick={() => navigate('/admin/overview')} className="rounded border border-gray-300 px-3 py-1.5 text-sm">Back</button>
        </div>

        <div className="mt-4 grid gap-2 text-sm text-gray-700 sm:grid-cols-3">
          <div className="rounded-md bg-lightGreen/40 p-3">Pending: {summary.pending}</div>
          <div className="rounded-md bg-lightGreen/40 p-3">Collected: {summary.collected}</div>
          <div className="rounded-md bg-lightGreen/40 p-3">Missed: {summary.missed}</div>
        </div>

        {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}
      </section>
    </Layout>
  );
}
