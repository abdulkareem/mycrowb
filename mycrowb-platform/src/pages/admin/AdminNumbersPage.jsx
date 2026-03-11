import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import Layout from '../../components/layout/Layout';

export default function AdminNumbersPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [mobile, setMobile] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    const response = await client.get('/super-admin/admin-numbers');
    setRows(response.data);
  };

  useEffect(() => {
    load().catch((error) => setMessage(error.response?.data?.message || 'Unable to load admin numbers.'));
  }, []);

  const addNumber = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      await client.post('/super-admin/admin-numbers', { mobile, isSuperAdmin });
      setMobile('');
      setIsSuperAdmin(false);
      await load();
      setMessage('Admin number saved successfully.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to save admin number.');
    }
  };

  const updateStatus = async (id, payload) => {
    try {
      await client.patch(`/super-admin/admin-numbers/${id}`, payload);
      await load();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to update admin number.');
    }
  };

  const deleteNumber = async (id) => {
    try {
      await client.delete(`/super-admin/admin-numbers/${id}`);
      await load();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to delete admin number.');
    }
  };

  return (
    <Layout title="Manage Admin Numbers">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-3 flex justify-end">
          <button type="button" className="rounded border border-gray-300 px-3 py-1.5 text-sm" onClick={() => navigate('/super-admin/overview')}>Back</button>
        </div>
        <form className="grid gap-3 sm:grid-cols-3" onSubmit={addNumber}>
          <input value={mobile} onChange={(e) => setMobile(e.target.value)} className="rounded-md border border-gray-300 p-2" placeholder="Admin WhatsApp number" required />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={isSuperAdmin} onChange={(e) => setIsSuperAdmin(e.target.checked)} />
            Mark as super admin
          </label>
          <button type="submit" className="rounded-md bg-primaryGreen p-2 text-white">Save</button>
        </form>

        {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border border-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Mobile</th>
                <th className="p-2 text-left">Role Type</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-gray-200">
                  <td className="p-2">{row.mobile}</td>
                  <td className="p-2">{row.isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN'}</td>
                  <td className="p-2">{row.isActive ? 'ACTIVE' : 'INACTIVE'}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => updateStatus(row.id, { isActive: !row.isActive })}>{row.isActive ? 'Deactivate' : 'Activate'}</button>
                      <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => updateStatus(row.id, { isSuperAdmin: !row.isSuperAdmin })}>{row.isSuperAdmin ? 'Set Admin' : 'Set Super Admin'}</button>
                      <button type="button" className="rounded border border-red-400 px-2 py-1 text-xs text-red-600" onClick={() => deleteNumber(row.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
}
