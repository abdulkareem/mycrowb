import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import Layout from '../../components/layout/Layout';

export default function RatingsDashboardPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    client.get('/ratings')
      .then((response) => setRows(response.data || []))
      .catch(() => setMessage('Unable to load ratings from database.'));
  }, []);

  const avg = useMemo(() => {
    if (!rows.length) return 0;
    return rows.reduce((acc, row) => acc + Number(row.rating || 0), 0) / rows.length;
  }, [rows]);

  return (
    <Layout title="Ratings Dashboard">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-gray-700">Messages and ratings submitted by shops.</p>
          <button type="button" onClick={() => navigate('/admin/overview')} className="rounded border border-gray-300 px-3 py-1.5 text-sm">Back</button>
        </div>
        <div className="mt-4 rounded-md bg-lightGreen/40 p-3 text-sm text-gray-700">Average collection rating: {avg.toFixed(1)} / 5</div>
        {message && <p className="mt-3 text-sm text-red-600">{message}</p>}
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border border-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Shop</th>
                <th className="p-2 text-left">Collector</th>
                <th className="p-2 text-left">Rating</th>
                <th className="p-2 text-left">Message</th>
                <th className="p-2 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-gray-200">
                  <td className="p-2">{row.shop?.shopName || '-'}</td>
                  <td className="p-2">{row.collector?.name || '-'}</td>
                  <td className="p-2">{row.rating}</td>
                  <td className="p-2">{row.comment || '-'}</td>
                  <td className="p-2">{new Date(row.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
}
