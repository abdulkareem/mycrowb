import { useEffect, useMemo, useState } from 'react';
import client from '../../api/client';
import Layout from '../../components/layout/Layout';
import ShopMap from '../../components/map/ShopMap';

export default function LoginActivitiesPage() {
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    client
      .get('/super-admin/login-activities')
      .then((response) => setRows(response.data))
      .catch((error) => setMessage(error.response?.data?.message || 'Unable to load login activities.'));
  }, []);

  const mapPoints = useMemo(() => rows
    .filter((row) => Number.isFinite(Number(row.latitude)) && Number.isFinite(Number(row.longitude)))
    .map((row) => ({
      id: row.id,
      shopName: `${row.user?.name || row.mobile} (${row.role})`,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      status: 'collected',
      clusterName: row.locationLabel || 'Current location'
    })), [rows]);

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
                <th className="p-2 text-left">Location</th>
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
                  <td className="p-2">{row.locationLabel || (row.latitude && row.longitude ? `${row.latitude}, ${row.longitude}` : '-')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <h2 className="mb-2 text-base font-semibold">Login location map</h2>
          {mapPoints.length ? <ShopMap shops={mapPoints} /> : <p className="text-sm text-gray-500">No location data available.</p>}
        </div>
      </section>
    </Layout>
  );
}
