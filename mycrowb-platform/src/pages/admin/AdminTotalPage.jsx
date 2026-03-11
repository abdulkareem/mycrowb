import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import Layout from '../../components/layout/Layout';
import { getAdminFieldCatalog, mergeWithCatalog } from '../../utils/adminFieldCatalog';
import { downloadCsv } from '../../utils/exportCsv';

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

export default function AdminTotalPage() {
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [clusterName, setClusterName] = useState('');
  const [district, setDistrict] = useState('');
  const [staffName, setStaffName] = useState('');
  const [rows, setRows] = useState([]);
  const [staffOptions, setStaffOptions] = useState([]);
  const [clusterOptions, setClusterOptions] = useState([]);
  const [districtOptions, setDistrictOptions] = useState([]);
  const [shopStats, setShopStats] = useState({ registered: 0, active: 0, inactive: 0 });
  const [registeredStaffNames, setRegisteredStaffNames] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [collectionsResponse, shopsResponse, staffResponse] = await Promise.all([
        client.get('/collections/admin/payments', { params: { year } }),
        client.get('/shops'),
        client.get('/staff')
      ]);

      const loadedRows = collectionsResponse.data.rows || [];
      const catalog = getAdminFieldCatalog();
      setRows(loadedRows);
      const paymentStaffOptions = collectionsResponse.data.filters?.staffOptions || [];
      const registeredStaff = Array.isArray(staffResponse.data) ? staffResponse.data : [];
      const registeredNames = registeredStaff
        .map((staff) => staff.name)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

      setStaffOptions(paymentStaffOptions);
      setRegisteredStaffNames(registeredNames);
      setClusterOptions(mergeWithCatalog((collectionsResponse.data.filters?.clusterOptions || []), catalog.clusters));
      setDistrictOptions(mergeWithCatalog(loadedRows.map((row) => row.district), catalog.districts));

      const shops = shopsResponse.data || [];
      setShopStats({
        registered: shops.length,
        active: shops.filter((shop) => shop.status === 'ACTIVE').length,
        inactive: shops.filter((shop) => shop.status === 'INACTIVE').length
      });
    };

    load();
  }, [year]);

  const selectedMonthKey = monthOptions.find((item) => item.value === Number(month))?.key;

  const allStaffOptions = useMemo(() => {
    const collectedStaffNames = staffOptions
      .map((staff) => staff.name)
      .filter(Boolean);

    return [...new Set([...collectedStaffNames, ...registeredStaffNames])].sort((a, b) => a.localeCompare(b));
  }, [staffOptions, registeredStaffNames]);

  const filteredRows = useMemo(() => rows.filter((row) => {
    if (clusterName && row.clusterName !== clusterName) return false;
    if (district && row.district !== district) return false;
    if (staffName) {
      if (!selectedMonthKey) {
        const handledByStaff = Object.values(row.months || {}).some((monthData) => monthData?.collector?.name === staffName);
        if (!handledByStaff) return false;
      } else {
        const monthCollector = row.months?.[selectedMonthKey]?.collector?.name;
        if (monthCollector !== staffName) return false;
      }
    }
    return true;
  }), [rows, clusterName, district, staffName, selectedMonthKey]);

  const totals = useMemo(() => filteredRows.reduce((acc, row) => {
    const monthData = selectedMonthKey ? row.months?.[selectedMonthKey] : null;
    if (!selectedMonthKey) {
      Object.values(row.months || {}).forEach((entry) => {
        if (!entry) return;

        if (entry.collected) {
          acc.totalHairCollected += Number(entry.fee || 0);
          if (entry.paid) {
            acc.totalMoneyCollected += Number((entry.fee || 0) + (entry.gst || 0));
            acc.totalGstCollected += Number(entry.gst || 0);
          }
        }

        if (entry.status === 'MISSED') {
          acc.totalMissed += 1;
        }

        if (!entry.collected) {
          acc.totalPending += 1;
        }
      });
      return acc;
    }

    if (!monthData) {
      acc.totalPending += 1;
      return acc;
    }

    if (monthData.collected) {
      acc.totalHairCollected += Number(monthData.fee || 0);
      if (monthData.paid) {
        acc.totalMoneyCollected += Number((monthData.fee || 0) + (monthData.gst || 0));
        acc.totalGstCollected += Number(monthData.gst || 0);
      }
    }

    if (monthData.status === 'MISSED') {
      acc.totalMissed += 1;
    }

    if (!monthData.collected) {
      acc.totalPending += 1;
    }

    return acc;
  }, {
    totalHairCollected: 0,
    totalMoneyCollected: 0,
    totalGstCollected: 0,
    totalMissed: 0,
    totalPending: 0
  }), [filteredRows, selectedMonthKey]);

  const exportSummary = () => {
    downloadCsv(
      `total-overview-${year}-${month || 'all'}.csv`,
      [
        { key: 'month', header: 'Month' },
        { key: 'year', header: 'Year' },
        { key: 'cluster', header: 'Cluster' },
        { key: 'district', header: 'District' },
        { key: 'staff', header: 'Staff' },
        { key: 'totalHairCollected', header: 'Total Hair Collected' },
        { key: 'totalMoneyCollected', header: 'Total Money Collected' },
        { key: 'totalGstCollected', header: 'Total GST Collected' },
        { key: 'totalMissed', header: 'Total Missed' },
        { key: 'totalPending', header: 'Total Pending' }
      ],
      [
        {
          month: selectedMonthKey ? monthOptions.find((item) => item.value === Number(month))?.label : 'All Months',
          year,
          cluster: clusterName || 'All',
          district: district || 'All',
          staff: staffName || 'All',
          totalHairCollected: totals.totalHairCollected.toFixed(2),
          totalMoneyCollected: totals.totalMoneyCollected.toFixed(2),
          totalGstCollected: totals.totalGstCollected.toFixed(2),
          totalMissed: totals.totalMissed,
          totalPending: totals.totalPending
        }
      ]
    );
  };

  return (
    <Layout title="Total Overview">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-gray-700">Month-wise totals by year, cluster, district, and staff.</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={exportSummary} className="rounded border border-gray-300 px-3 py-1.5 text-sm">Export below data to Excel</button>
            <button type="button" onClick={() => navigate('/admin/overview')} className="rounded border border-gray-300 px-3 py-1.5 text-sm">Back</button>
          </div>
        </div>

        <div className="grid gap-2 text-sm text-gray-700 sm:grid-cols-3">
          <div className="rounded-md bg-lightGreen/40 p-3">Registered shops: {shopStats.registered}</div>
          <div className="rounded-md bg-lightGreen/40 p-3">Active shops: {shopStats.active}</div>
          <div className="rounded-md bg-lightGreen/40 p-3">Inactive shops: {shopStats.inactive}</div>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="mr-2 text-sm text-gray-700" htmlFor="total-year">Year</label>
            <input id="total-year" type="number" value={year} onChange={(event) => setYear(Number(event.target.value) || now.getFullYear())} className="w-28 rounded border border-gray-300 px-2 py-1" />
          </div>
          <div>
            <label className="mr-2 text-sm text-gray-700" htmlFor="total-month">Month</label>
            <select id="total-month" value={month} onChange={(event) => setMonth(event.target.value)} className="rounded border border-gray-300 px-2 py-1">
              <option value="">All Months</option>
              {monthOptions.map((option) => <option key={option.key} value={String(option.value)}>{option.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mr-2 text-sm text-gray-700" htmlFor="total-cluster">Cluster</label>
            <select id="total-cluster" value={clusterName} onChange={(event) => setClusterName(event.target.value)} className="min-w-44 rounded border border-gray-300 px-2 py-1">
              <option value="">All clusters</option>
              {clusterOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <label className="mr-2 text-sm text-gray-700" htmlFor="total-district">District</label>
            <select id="total-district" value={district} onChange={(event) => setDistrict(event.target.value)} className="min-w-44 rounded border border-gray-300 px-2 py-1">
              <option value="">All districts</option>
              {districtOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <label className="mr-2 text-sm text-gray-700" htmlFor="total-staff">Staff</label>
            <select id="total-staff" value={staffName} onChange={(event) => setStaffName(event.target.value)} className="min-w-44 rounded border border-gray-300 px-2 py-1">
              <option value="">All staff</option>
              {allStaffOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2">Month</th>
                <th className="p-2">Year</th>
                <th className="p-2">Cluster</th>
                <th className="p-2">District</th>
                <th className="p-2">Staff</th>
                <th className="p-2">Total Hair Collected</th>
                <th className="p-2">Total Money Collected</th>
                <th className="p-2">Total GST Collected</th>
                <th className="p-2">Total Missed</th>
                <th className="p-2">Total Pending</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="p-2">{selectedMonthKey ? monthOptions.find((item) => item.value === Number(month))?.label : 'All Months'}</td>
                <td className="p-2">{year}</td>
                <td className="p-2">{clusterName || 'All'}</td>
                <td className="p-2">{district || 'All'}</td>
                <td className="p-2">{staffName || 'All'}</td>
                <td className="p-2">{totals.totalHairCollected.toFixed(2)}</td>
                <td className="p-2">{totals.totalMoneyCollected.toFixed(2)}</td>
                <td className="p-2">{totals.totalGstCollected.toFixed(2)}</td>
                <td className="p-2">{totals.totalMissed}</td>
                <td className="p-2">{totals.totalPending}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
}
