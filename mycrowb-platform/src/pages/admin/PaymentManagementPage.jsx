import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import Layout from '../../components/layout/Layout';
import { downloadCsv } from '../../utils/exportCsv';

const monthLabels = [
  { key: 'jan', label: 'Jan' },
  { key: 'feb', label: 'Feb' },
  { key: 'mar', label: 'Mar' },
  { key: 'apr', label: 'Apr' },
  { key: 'may', label: 'May' },
  { key: 'jun', label: 'Jun' },
  { key: 'jul', label: 'Jul' },
  { key: 'aug', label: 'Aug' },
  { key: 'sep', label: 'Sep' },
  { key: 'oct', label: 'Oct' },
  { key: 'nov', label: 'Nov' },
  { key: 'dec', label: 'Dec' }
];

export default function PaymentManagementPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [clusterName, setClusterName] = useState('');
  const [collectorId, setCollectorId] = useState('');
  const [clusterOptions, setClusterOptions] = useState([]);
  const [staffOptions, setStaffOptions] = useState([]);
  const [summary, setSummary] = useState({ monthlyTotals: {}, monthlyTotalsAllData: {}, yearlyGrandTotals: { fee: 0, gst: 0, total: 0 } });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadRegisteredStaff = async () => {
    try {
      const response = await client.get('/staff');
      const mapped = (response.data || []).map((staff) => ({
        id: staff.id,
        name: staff.name,
        mobile: staff.mobileNumber || staff.whatsappNumber || '-',
        staffIdNumber: staff.staffIdNumber || '-',
        status: staff.isActive ? 'Active' : 'Inactive'
      }));
      setStaffOptions((prev) => {
        const byId = new Map(prev.map((item) => [item.id, item]));
        mapped.forEach((item) => byId.set(item.id, { ...byId.get(item.id), ...item }));
        return [...byId.values()].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
      });
    } catch (_error) {
      // fallback to API filter options
    }
  };

  const loadPayments = async () => {
    setLoading(true);
    try {
      const response = await client.get('/collections/admin/payments', {
        params: {
          year,
          clusterName: clusterName || undefined,
          collectorId: collectorId || undefined
        }
      });
      setRows(response.data.rows || []);
      setClusterOptions(response.data.filters?.clusterOptions || []);
      setStaffOptions(response.data.filters?.staffOptions || []);
      setSummary(response.data.summary || { monthlyTotals: {}, monthlyTotalsAllData: {}, yearlyGrandTotals: { fee: 0, gst: 0, total: 0 } });
    } catch (_error) {
      setMessage('Unable to load payment table.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [year, clusterName, collectorId]);

  useEffect(() => {
    loadRegisteredStaff();
  }, []);

  const verifyPayment = async (shopId, month) => {
    try {
      await client.patch(`/collections/admin/payments/${shopId}/${month}/verify`, { year });
      setMessage('Payment verified and receipt generated successfully.');
      loadPayments();
    } catch (_error) {
      setMessage('Unable to verify payment for this month.');
    }
  };

  const tableRows = useMemo(() => rows, [rows]);

  const getMonthCellClass = (monthData) => {
    if (monthData?.status === 'MISSED') return 'bg-red-100';
    if (monthData?.collected && monthData?.paid) return 'bg-green-100';
    if (!monthData?.collected || monthData?.status === 'PENDING') return 'bg-yellow-100';
    return 'bg-yellow-100';
  };

  const exportPayments = () => {
    const flatRows = tableRows.map((row) => ({
      shopRegistrationNumber: row.shopRegistrationNumber || '-',
      shopName: row.shopName || '-',
      ownerName: row.ownerName || '-',
      clusterName: row.clusterName || '-',
      tippingFee: Number(row.tippingFee || 0).toFixed(2),
      gst: Number(row.gst || 0).toFixed(2),
      pendingMonths: row.pendingMonths || 0,
      collectedMonths: row.collectedMonths || 0,
      totalFeeCollected: Number(row.totalFeeCollected || 0).toFixed(2),
      totalGstCollected: Number(row.totalGstCollected || 0).toFixed(2),
      totalAmountCollected: Number((Number(row.totalFeeCollected || 0) + Number(row.totalGstCollected || 0)).toFixed(2)).toFixed(2)
    }));

    downloadCsv(`payments-${year}.csv`, [
      { key: 'shopRegistrationNumber', header: 'Shop Reg Number' },
      { key: 'shopName', header: 'Shop Name' },
      { key: 'ownerName', header: 'Owner Name' },
      { key: 'clusterName', header: 'Cluster Name' },
      { key: 'tippingFee', header: 'Tipping Fee' },
      { key: 'gst', header: 'GST' },
      { key: 'pendingMonths', header: 'Pending Months' },
      { key: 'collectedMonths', header: 'Collected Months' },
      { key: 'totalFeeCollected', header: 'Total Fee Collected' },
      { key: 'totalGstCollected', header: 'Total GST Collected' },
      { key: 'totalAmountCollected', header: 'Total Amount Collected' }
    ], flatRows);

    setMessage('Payment data exported successfully.');
  };

  return (
    <Layout title="Payment Management">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <p className="text-gray-700">Verify monthly collections and generate receipts for hair & beauty establishments.</p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="mr-2 text-sm text-gray-700" htmlFor="year-input">Year</label>
            <input
              id="year-input"
              type="number"
              value={year}
              onChange={(event) => setYear(Number(event.target.value) || new Date().getFullYear())}
              className="w-28 rounded border border-gray-300 px-2 py-1"
            />
          </div>

          <div>
            <label className="mr-2 text-sm text-gray-700" htmlFor="cluster-filter">Cluster</label>
            <select
              id="cluster-filter"
              value={clusterName}
              onChange={(event) => setClusterName(event.target.value)}
              className="min-w-48 rounded border border-gray-300 px-2 py-1"
            >
              <option value="">All clusters</option>
              {clusterOptions.map((cluster) => (
                <option key={cluster} value={cluster}>{cluster}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mr-2 text-sm text-gray-700" htmlFor="staff-filter">Collection Staff</label>
            <select
              id="staff-filter"
              value={collectorId}
              onChange={(event) => setCollectorId(event.target.value)}
              className="min-w-48 rounded border border-gray-300 px-2 py-1"
            >
              <option value="">All registered collection staff</option>
              {staffOptions.map((staff) => (
                <option key={staff.id} value={staff.id}>{staff.name} ({staff.staffIdNumber || 'No ID'}) - {staff.mobile} [{staff.status || 'Active'}]</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={exportPayments}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700"
            disabled={!tableRows.length}
          >
            Import as Excel Sheet
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/overview')}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700"
          >
            Back
          </button>
        </div>

        {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}

        {collectorId && (
          <p className="mt-2 text-sm text-gray-600">Showing payment details for selected collection staff.</p>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs uppercase text-gray-600">
                <th className="p-2">Shop Reg Number</th>
                <th className="p-2">Shop Name</th>
                <th className="p-2">Owner Name</th>
                <th className="p-2">Cluster Name</th>
                <th className="p-2">Tipping Fee</th>
                <th className="p-2">GST</th>
                {monthLabels.map((month) => (
                  <th key={month.key} className="p-2">{month.label}</th>
                ))}
                <th className="p-2">Pending Months</th>
                <th className="p-2">Collected Months</th>
                <th className="p-2">Total Fee Collected</th>
                <th className="p-2">Total GST Collected</th>
                <th className="p-2">Total Amount Collected</th>
              </tr>
            </thead>
            <tbody>
              {!loading && tableRows.map((row) => (
                <tr key={row.id} className={`border-b align-top ${row.pendingMonths >= 3 ? 'bg-red-50' : ''}`}>
                  <td className="p-2">{row.shopRegistrationNumber || '-'}</td>
                  <td className="p-2">{row.shopName || '-'}</td>
                  <td className="p-2">{row.ownerName || '-'}</td>
                  <td className="p-2">{row.clusterName || '-'}</td>
                  <td className="p-2">₹{Number(row.tippingFee || 0).toFixed(2)}</td>
                  <td className="p-2">₹{Number(row.gst || 0).toFixed(2)}</td>
                  {monthLabels.map((month) => {
                    const monthData = row.months?.[month.key];
                    return (
                      <td key={`${row.id}-${month.key}`} className={`p-2 ${getMonthCellClass(monthData)}`}>
                        <div className="flex min-w-36 flex-col gap-1">
                          {monthData?.collected && monthData?.paid ? (
                            <span>₹{Number(monthData.fee || 0).toFixed(2)} + ₹{Number(monthData.gst || 0).toFixed(2)}</span>
                          ) : (
                            <span className="text-xs">{monthData?.status === 'MISSED' ? 'Missed' : 'Pending'}</span>
                          )}
                          {monthData?.status === 'MISSED' && <span className="text-xs text-red-700">Missed</span>}
                          {monthData?.collected && monthData?.paid && <span className="text-xs text-green-700">Verified</span>}
                          {monthData?.collected && !monthData?.paid && (
                            <button
                              type="button"
                              className="rounded bg-primaryGreen px-2 py-1 text-xs text-white"
                              onClick={() => verifyPayment(row.id, monthData.month)}
                            >
                              Payment verified
                            </button>
                          )}
                          {monthData?.receiptUrl && (
                            <a
                              href={`${client.defaults.baseURL?.replace('/api/v1', '')}${monthData.receiptUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-primaryGreen underline"
                            >
                              Receipt
                            </a>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className={`p-2 font-semibold ${row.pendingMonths >= 3 ? 'text-red-600' : ''}`}>{row.pendingMonths}</td>
                  <td className="p-2">{row.collectedMonths || 0}</td>
                  <td className="p-2">₹{Number(row.totalFeeCollected || 0).toFixed(2)}</td>
                  <td className="p-2">₹{Number(row.totalGstCollected || 0).toFixed(2)}</td>
                  <td className="p-2">₹{Number((Number(row.totalFeeCollected || 0) + Number(row.totalGstCollected || 0)).toFixed(2))}</td>
                </tr>
              ))}
              {!loading && tableRows.length > 0 && (
                <tr className="border-b bg-green-50 font-semibold">
                  <td className="p-2" colSpan={6}>Filtered Monthly Totals</td>
                  {monthLabels.map((month) => {
                    const monthSummary = summary.monthlyTotals?.[month.key];
                    return (
                      <td key={`summary-${month.key}`} className="p-2 text-xs">
                        ₹{Number(monthSummary?.fee || 0).toFixed(2)} + ₹{Number(monthSummary?.gst || 0).toFixed(2)}
                      </td>
                    );
                  })}
                  <td className="p-2">-</td>
                  <td className="p-2">-</td>
                  <td className="p-2">
                    ₹{monthLabels.reduce((acc, month) => acc + Number(summary.monthlyTotals?.[month.key]?.fee || 0), 0).toFixed(2)}
                  </td>
                  <td className="p-2">
                    ₹{monthLabels.reduce((acc, month) => acc + Number(summary.monthlyTotals?.[month.key]?.gst || 0), 0).toFixed(2)}
                  </td>
                  <td className="p-2">
                    ₹{monthLabels.reduce((acc, month) => acc + Number(summary.monthlyTotals?.[month.key]?.total || 0), 0).toFixed(2)}
                  </td>
                </tr>
              )}
              {!loading && (
                <tr className="bg-blue-50 font-semibold">
                  <td className="p-2" colSpan={6}>Year Total (All DB Data)</td>
                  {monthLabels.map((month) => {
                    const monthAllData = summary.monthlyTotalsAllData?.[month.key];
                    return <td key={`year-${month.key}`} className="p-2 text-xs">₹{Number(monthAllData?.fee || 0).toFixed(2)} + GST ₹{Number(monthAllData?.gst || 0).toFixed(2)}</td>;
                  })}
                  <td className="p-2">-</td>
                  <td className="p-2">-</td>
                  <td className="p-2">₹{Number(summary.yearlyGrandTotals?.fee || 0).toFixed(2)}</td>
                  <td className="p-2">₹{Number(summary.yearlyGrandTotals?.gst || 0).toFixed(2)}</td>
                  <td className="p-2">₹{Number(summary.yearlyGrandTotals?.total || 0).toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>
          {loading && <p className="p-3 text-sm text-gray-600">Loading payments...</p>}
          {!loading && !tableRows.length && <p className="p-3 text-sm text-gray-600">No payment rows found.</p>}
        </div>
      </section>
    </Layout>
  );
}
