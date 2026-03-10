import { useEffect, useMemo, useState } from 'react';
import client from '../../api/client';
import Layout from '../../components/layout/Layout';

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
  const [rows, setRows] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadPayments = async () => {
    setLoading(true);
    try {
      const response = await client.get('/collections/admin/payments', { params: { year } });
      setRows(response.data.rows || []);
    } catch (_error) {
      setMessage('Unable to load payment table.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [year]);

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

  return (
    <Layout title="Payment Management">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <p className="text-gray-700">Verify monthly collections and generate receipts for barber shops.</p>

        <div className="mt-4">
          <label className="mr-2 text-sm text-gray-700" htmlFor="year-input">Year</label>
          <input
            id="year-input"
            type="number"
            value={year}
            onChange={(event) => setYear(Number(event.target.value) || new Date().getFullYear())}
            className="w-28 rounded border border-gray-300 px-2 py-1"
          />
        </div>

        {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}

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
              </tr>
            </thead>
            <tbody>
              {!loading && tableRows.map((row) => (
                <tr key={row.id} className={`border-b align-top ${row.pendingMonths === 3 ? 'bg-red-100' : ''}`}>
                  <td className="p-2">{row.shopRegistrationNumber || '-'}</td>
                  <td className="p-2">{row.shopName || '-'}</td>
                  <td className="p-2">{row.ownerName || '-'}</td>
                  <td className="p-2">{row.clusterName || '-'}</td>
                  <td className="p-2">₹{Number(row.tippingFee || 0).toFixed(2)}</td>
                  <td className="p-2">₹{Number(row.gst || 0).toFixed(2)}</td>
                  {monthLabels.map((month) => {
                    const monthData = row.months?.[month.key];
                    if (!monthData?.collected) {
                      return <td key={`${row.id}-${month.key}`} className="p-2 text-gray-400">-</td>;
                    }

                    return (
                      <td key={`${row.id}-${month.key}`} className="p-2">
                        <div className="flex min-w-36 flex-col gap-1">
                          <span>₹{Number(monthData.fee || 0).toFixed(2)} + ₹{Number(monthData.gst || 0).toFixed(2)}</span>
                          {monthData.paid ? (
                            <span className="text-xs text-green-700">Verified</span>
                          ) : (
                            <button
                              type="button"
                              className="rounded bg-primaryGreen px-2 py-1 text-xs text-white"
                              onClick={() => verifyPayment(row.id, monthData.month)}
                            >
                              Payment verified
                            </button>
                          )}
                          {monthData.receiptUrl && (
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
                  <td className="p-2">{row.pendingMonths}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <p className="p-3 text-sm text-gray-600">Loading payments...</p>}
          {!loading && !tableRows.length && <p className="p-3 text-sm text-gray-600">No payment rows found.</p>}
        </div>
      </section>
    </Layout>
  );
}
