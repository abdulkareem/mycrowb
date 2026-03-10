import { useEffect, useState } from 'react';
import client from '../../api/client';
import Layout from '../../components/layout/Layout';

export default function LoginActivitiesPage() {
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    client
      .get('/super-admin/login-activities')
      .then((response) => setRows(response.data))
      .catch((error) => setMessage(error.response?.data?.message || 'Unable to load login activities.'));
  }, []);

  return (
    <Layout title="Login Activity Logs">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        {message && <p className="mb-3 text-sm text-red-600">{message}</p>}
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Role</th>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Mobile</th>
                <th className="p-2 text-left">Login Time</th>
                <th className="p-2 text-left">Logout Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-gray-200">
                  <td className="p-2">{row.role}</td>
                  <td className="p-2">{row.user?.name || '-'}</td>
                  <td className="p-2">{row.mobile}</td>
                  <td className="p-2">{new Date(row.loginAt).toLocaleString()}</td>
                  <td className="p-2">{row.logoutAt ? new Date(row.logoutAt).toLocaleString() : 'Active session'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
}
