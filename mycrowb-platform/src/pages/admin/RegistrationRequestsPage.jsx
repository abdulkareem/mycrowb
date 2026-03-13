import { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import client from '../../api/client';

export default function RegistrationRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [message, setMessage] = useState('');

  const loadRequests = async () => {
    try {
      const response = await client.get('/registration/requests');
      setRequests(response.data.requests || []);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to load registration requests.');
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const act = async (id, action) => {
    try {
      await client.patch(`/registration/requests/${id}`, { action });
      loadRequests();
    } catch (error) {
      setMessage(error.response?.data?.message || `Unable to ${action} request.`);
    }
  };

  return (
    <Layout title="New Registration Requests">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="border p-2">Request ID</th>
                <th className="border p-2">Name</th>
                <th className="border p-2">Mobile</th>
                <th className="border p-2">Shop Name</th>
                <th className="border p-2">District</th>
                <th className="border p-2">Location</th>
                <th className="border p-2">Status</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td className="border p-2">{request.id}</td>
                  <td className="border p-2">{request.name}</td>
                  <td className="border p-2">{request.mobile}</td>
                  <td className="border p-2">{request.shopName}</td>
                  <td className="border p-2">{request.district}</td>
                  <td className="border p-2">{request.latitude}, {request.longitude}</td>
                  <td className="border p-2 capitalize">{request.status}</td>
                  <td className="border p-2">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="rounded border px-2 py-1" onClick={() => act(request.id, 'edit')}>Edit</button>
                      <button type="button" className="rounded bg-green-600 px-2 py-1 text-white" onClick={() => act(request.id, 'approve')}>Approve</button>
                      <button type="button" className="rounded bg-red-600 px-2 py-1 text-white" onClick={() => act(request.id, 'reject')}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {message && <p className="mt-3 text-sm text-red-600">{message}</p>}
      </section>
    </Layout>
  );
}
