import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import Layout from '../../components/layout/Layout';

function buildReceiptDownloadUrl(collectionId) {
  return `${client.defaults.baseURL.replace('/api/v1', '')}/api/v1/collections/${collectionId}/receipt-download`;
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
                const verified = Boolean(item.paid && item.receipt?.receiptNumber);
                const url = buildReceiptDownloadUrl(item.id);
                return (
                  <tr key={item.id} className="border-b">
                    <td className="p-2">{item.collectionDate ? new Date(item.collectionDate).toLocaleDateString() : '-'}</td>
                    <td className="p-2">{item.collector?.name || '-'}</td>
                    <td className="p-2">{item.hairWeight} kg</td>
                    <td className="p-2">{verified ? 'Verified' : 'Verification pending'}</td>
                    <td className="p-2">
                      {verified ? (
                        <a className="rounded-md bg-primaryGreen px-3 py-1 text-xs text-white" href={url}>
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

        <Link to="/barber/dashboard" className="mt-4 inline-block text-sm font-medium text-primaryGreen">← Back to dashboard</Link>
      </section>
    </Layout>
  );
}
