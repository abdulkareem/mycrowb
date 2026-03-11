import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import Layout from '../../components/layout/Layout';

function monthLabel(month, year) {
  return new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function receiptUrl(pdfUrl) {
  if (!pdfUrl) return '';
  return `${client.defaults.baseURL.replace('/api/v1', '')}${pdfUrl}`;
}

export default function CollectionHistoryPage() {
  const [collections, setCollections] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    client
      .get('/collections/my')
      .then((res) => setCollections(res.data))
      .catch(() => setError('Unable to load collections from database.'));
  }, []);

  const monthlyVerifiedReceipts = useMemo(
    () =>
      collections.filter((item) => item.paid && item.receipt?.pdfUrl).map((item) => ({
        key: `${item.year}-${item.month}`,
        label: monthLabel(item.month, item.year),
        url: receiptUrl(item.receipt.pdfUrl)
      })),
    [collections]
  );

  return (
    <Layout title="Collection History">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <p className="text-gray-700">Collection data from database with admin verification status.</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">Collected date</th>
                <th className="p-2">Collection staff</th>
                <th className="p-2">Quantity</th>
                <th className="p-2">Admin verified</th>
                <th className="p-2">Receipt PDF</th>
              </tr>
            </thead>
            <tbody>
              {collections.map((item) => {
                const verified = Boolean(item.paid);
                const url = receiptUrl(item.receipt?.pdfUrl);
                return (
                  <tr key={item.id} className="border-b">
                    <td className="p-2">{item.collectionDate ? new Date(item.collectionDate).toLocaleDateString() : '-'}</td>
                    <td className="p-2">{item.collector?.name || '-'}</td>
                    <td className="p-2">{item.hairWeight} kg</td>
                    <td className="p-2">{verified ? 'Verified' : 'Verification pending'}</td>
                    <td className="p-2">
                      {verified && url ? (
                        <a className="rounded-md bg-primaryGreen px-3 py-1 text-xs text-white" href={url} target="_blank" rel="noreferrer">
                          Download PDF
                        </a>
                      ) : (
                        <button className="cursor-not-allowed rounded-md bg-gray-200 px-3 py-1 text-xs text-gray-500" disabled>
                          Download PDF
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-5">
          <p className="font-medium text-gray-800">Monthly receipt downloads (admin-verified collections)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {monthlyVerifiedReceipts.map((receipt) => (
              <a key={receipt.key} className="rounded-md bg-primaryGreen px-3 py-2 text-xs text-white" href={receipt.url} target="_blank" rel="noreferrer">
                Download {receipt.label} receipt
              </a>
            ))}
            {monthlyVerifiedReceipts.length === 0 && <p className="text-sm text-gray-600">No verified receipts available.</p>}
          </div>
        </div>

        <Link to="/barber/dashboard" className="mt-4 inline-block text-sm font-medium text-primaryGreen">← Back to dashboard</Link>
      </section>
    </Layout>
  );
}
