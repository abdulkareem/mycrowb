import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import client from '../../api/client';

const initialForm = {
  name: '',
  address: '',
  whatsappNumber: '',
  mobileNumber: '',
  aadhaarNumber: '',
  vehicleNumber: '',
  clustersAllotted: '',
  staffIdNumber: '',
  commissionPerShop: '',
  salaryPerMonth: ''
};

const minPhotoSize = 1 * 1024;
const maxPhotoSize = 200 * 1024;

export default function CertificateIssuancePage() {
  const navigate = useNavigate();
  const [staffList, setStaffList] = useState([]);
  const [clusterOptions, setClusterOptions] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [photo, setPhoto] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const baseUploadUrl = useMemo(() => client.defaults.baseURL?.replace('/api/v1', '') || '', []);

  const getPhotoUrl = (photoUrl) => {
    if (!photoUrl) return '';
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) return photoUrl;
    return `${baseUploadUrl}${photoUrl.startsWith('/') ? photoUrl : `/${photoUrl}`}`;
  };

  const loadStaff = async () => {
    try {
      const response = await client.get('/staff');
      setStaffList(response.data || []);
    } catch (_error) {
      setMessage('Unable to load staff records.');
    }
  };

  const loadClusterOptions = async () => {
    try {
      const response = await client.get('/shops', { params: { sortField: 'clusterName', sortOrder: 'asc' } });
      const clusters = [...new Set((response.data || []).map((shop) => shop.clusterName).filter(Boolean))];
      setClusterOptions(clusters);
    } catch (_error) {
      setMessage('Unable to load cluster options.');
    }
  };

  useEffect(() => {
    loadStaff();
    loadClusterOptions();
  }, []);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    setPhoto(file || null);
  };

  const resetForm = () => {
    setForm(initialForm);
    setPhoto(null);
    setShowForm(false);
  };

  const saveStaff = async (event) => {
    event.preventDefault();
    if (!photo) {
      setMessage('Photo is required.');
      return;
    }
    if (photo.size < minPhotoSize || photo.size > maxPhotoSize) {
      setMessage('Photo size should be between 1KB and 200KB.');
      return;
    }

    try {
      setLoading(true);
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, value));
      payload.append('photo', photo);
      await client.post('/staff', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage('Staff saved successfully.');
      resetForm();
      await loadStaff();
    } catch (_error) {
      setMessage('Failed to save staff.');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id) => {
    try {
      await client.patch(`/staff/${id}/status`);
      await loadStaff();
    } catch (_error) {
      setMessage('Unable to update staff status.');
    }
  };

  const deleteStaff = async (id) => {
    try {
      await client.delete(`/staff/${id}`);
      setMessage('Staff deleted successfully.');
      await loadStaff();
    } catch (_error) {
      setMessage('Unable to delete staff.');
    }
  };

  return (
    <Layout title="Staff">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-gray-700">Manage staff list, status and payout details.</p>
          <div className="flex items-center gap-2">
            <button className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700" onClick={() => navigate(-1)} type="button">
              Back
            </button>
            <button className="rounded-md bg-primaryGreen px-3 py-2 text-sm text-white" onClick={() => setShowForm((prev) => !prev)} type="button">
              {showForm ? 'Close form' : 'Add new staff'}
            </button>
          </div>
        </div>

        {showForm && (
          <form className="mt-4 grid gap-3 rounded-lg border border-gray-200 p-4 md:grid-cols-2" onSubmit={saveStaff}>
            <input className="rounded-md border border-gray-300 p-2" name="name" onChange={handleFormChange} placeholder="Name" required value={form.name} />
            <input className="rounded-md border border-gray-300 p-2" name="address" onChange={handleFormChange} placeholder="Address" required value={form.address} />
            <input className="rounded-md border border-gray-300 p-2" name="whatsappNumber" onChange={handleFormChange} placeholder="WhatsApp" required value={form.whatsappNumber} />
            <input className="rounded-md border border-gray-300 p-2" name="mobileNumber" onChange={handleFormChange} placeholder="Mobile" required value={form.mobileNumber} />
            <input className="rounded-md border border-gray-300 p-2" name="aadhaarNumber" onChange={handleFormChange} placeholder="Aadhaar number" required value={form.aadhaarNumber} />
            <input className="rounded-md border border-gray-300 p-2" name="vehicleNumber" onChange={handleFormChange} placeholder="Vehicle number" required value={form.vehicleNumber} />
            <select className="rounded-md border border-gray-300 p-2" name="clustersAllotted" onChange={handleFormChange} required value={form.clustersAllotted}>
              <option value="">Select cluster</option>
              {clusterOptions.map((cluster) => (
                <option key={cluster} value={cluster}>{cluster}</option>
              ))}
            </select>
            <input className="rounded-md border border-gray-300 p-2" name="staffIdNumber" onChange={handleFormChange} placeholder="Staff ID number" required value={form.staffIdNumber} />
            <input className="rounded-md border border-gray-300 p-2" min="0" name="commissionPerShop" onChange={handleFormChange} placeholder="Commission per shop" required step="0.01" type="number" value={form.commissionPerShop} />
            <input className="rounded-md border border-gray-300 p-2" min="0" name="salaryPerMonth" onChange={handleFormChange} placeholder="Salary per month" required step="0.01" type="number" value={form.salaryPerMonth} />
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-gray-700" htmlFor="photo">Photo (1KB to 200KB)</label>
              <input accept="image/*" className="w-full rounded-md border border-gray-300 p-2" id="photo" onChange={handlePhotoChange} required type="file" />
            </div>
            <button className="rounded-md bg-primaryGreen px-3 py-2 text-sm text-white disabled:opacity-60 md:col-span-2" disabled={loading} type="submit">
              {loading ? 'Saving...' : 'Save'}
            </button>
          </form>
        )}

        {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2">Photo</th><th className="p-2">Name</th><th className="p-2">Status</th><th className="p-2">Address</th><th className="p-2">WhatsApp</th><th className="p-2">Mobile</th><th className="p-2">Aadhaar</th><th className="p-2">Vehicle</th><th className="p-2">Clusters</th><th className="p-2">Staff ID</th><th className="p-2">Commission/shop</th><th className="p-2">Salary/month</th><th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((staff) => (
                <tr className="border-b border-gray-200" key={staff.id}>
                  <td className="p-2">
                    {staff.photoUrl ? (
                      <img
                        alt={staff.name}
                        className="h-20 w-20 rounded object-cover"
                        onError={(event) => { event.currentTarget.style.display = 'none'; }}
                        src={getPhotoUrl(staff.photoUrl)}
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded bg-gray-100 text-xs text-gray-500">No photo</div>
                    )}
                  </td>
                  <td className="p-2">{staff.name}</td>
                  <td className="p-2">{staff.isActive ? 'Active' : 'Inactive'}</td>
                  <td className="p-2">{staff.address}</td>
                  <td className="p-2">{staff.whatsappNumber}</td>
                  <td className="p-2">{staff.mobileNumber}</td>
                  <td className="p-2">{staff.aadhaarNumber}</td>
                  <td className="p-2">{staff.vehicleNumber}</td>
                  <td className="p-2">{staff.clustersAllotted}</td>
                  <td className="p-2">{staff.staffIdNumber}</td>
                  <td className="p-2">₹{Number(staff.commissionPerShop).toFixed(2)}</td>
                  <td className="p-2">₹{Number(staff.salaryPerMonth).toFixed(2)}</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <button className="rounded-md border border-primaryGreen px-2 py-1 text-xs text-primaryGreen" onClick={() => toggleStatus(staff.id)} type="button">
                        {staff.isActive ? 'Set Inactive' : 'Set Active'}
                      </button>
                      <button className="rounded-md border border-red-400 px-2 py-1 text-xs text-red-600" onClick={() => deleteStaff(staff.id)} type="button">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!staffList.length && (
                <tr>
                  <td className="p-4 text-center text-gray-500" colSpan="13">No staff records yet. Click "Add new staff" to create one.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
}
