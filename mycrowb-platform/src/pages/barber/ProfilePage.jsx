import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import Layout from '../../components/layout/Layout';

const defaultForm = {
  shopName: '',
  ownerName: '',
  roomNumber: '',
  buildingNumber: '',
  wardNumber: '',
  localBody: '',
  place: '',
  address: '',
  district: '',
  registeredAssociationName: '',
  category: '',
  clusterName: '',
  state: '',
  latitude: '',
  longitude: '',
  whatsappNumber: '',
  employeeCount: '',
  chairCount: ''
};

export default function ProfilePage() {
  const [form, setForm] = useState(defaultForm);
  const [locked, setLocked] = useState(false);
  const [editApproved, setEditApproved] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    client
      .get('/shops/me')
      .then((res) => {
        const data = res.data;
        setForm({
          shopName: data.shopName || '',
          ownerName: data.ownerName || data.owner?.name || '',
          roomNumber: data.roomNumber || '',
          buildingNumber: data.buildingNumber || '',
          wardNumber: data.wardNumber || '',
          localBody: data.localBody || '',
          place: data.place || '',
          address: data.address || '',
          district: data.district || '',
          registeredAssociationName: data.registeredAssociationName || '',
          category: data.category || '',
          clusterName: data.clusterName || '',
          state: data.state || '',
          latitude: data.latitude ?? '',
          longitude: data.longitude ?? '',
          whatsappNumber: data.whatsappNumber || data.owner?.mobile || '',
          employeeCount: data.employeeCount ?? '',
          chairCount: data.chairCount ?? ''
        });
        setLocked(Boolean(data.profileLocked));
        setEditApproved(Boolean(data.editApproved));
      })
      .catch(() => setMessage('Unable to load profile from database.'));
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const getLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      setForm((prev) => ({
        ...prev,
        latitude: position.coords.latitude.toFixed(6),
        longitude: position.coords.longitude.toFixed(6)
      }));
    });
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      await client.put('/shops/me/profile', form);
      setLocked(true);
      setEditApproved(false);
      setMessage('Profile saved, locked and sent to database.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to save profile.');
    }
  };

  const requestEdit = async () => {
    setMessage('');
    try {
      await client.post('/shops/me/request-edit');
      setLocked(true);
      setEditApproved(false);
      setMessage('Edit request sent to admin. Waiting for admin to unblock.');
    } catch (_error) {
      setMessage('Unable to send edit request.');
    }
  };

  const readOnly = locked && !editApproved;

  return (
    <Layout title="Profile">
      <form className="max-w-3xl rounded-xl bg-white p-6 shadow-sm grid gap-3" onSubmit={saveProfile}>
        <p className="text-gray-700">Complete profile once; all fields are mandatory and lock after save. Edit is allowed only after admin approval.</p>

        <input name="shopName" value={form.shopName} onChange={handleChange} className="rounded-md border border-gray-300 p-2" placeholder="Shop name" readOnly={readOnly} required />
        <input name="ownerName" value={form.ownerName} onChange={handleChange} className="rounded-md border border-gray-300 p-2" placeholder="Owner name" readOnly={readOnly} required />
        <input name="roomNumber" value={form.roomNumber} onChange={handleChange} className="rounded-md border border-gray-300 p-2" placeholder="Room number" readOnly={readOnly} required />
        <input name="buildingNumber" value={form.buildingNumber} onChange={handleChange} className="rounded-md border border-gray-300 p-2" placeholder="Building number" readOnly={readOnly} required />
        <input name="wardNumber" value={form.wardNumber} onChange={handleChange} className="rounded-md border border-gray-300 p-2" placeholder="Ward number" readOnly={readOnly} required />
        <input name="localBody" value={form.localBody} onChange={handleChange} className="rounded-md border border-gray-300 p-2" placeholder="Local body" readOnly={readOnly} required />
        <input name="place" value={form.place} onChange={handleChange} className="rounded-md border border-gray-300 p-2" placeholder="Place" readOnly={readOnly} required />
        <input name="address" value={form.address} onChange={handleChange} className="rounded-md border border-gray-300 p-2" placeholder="Address" readOnly={readOnly} required />
        <input name="district" value={form.district} onChange={handleChange} className="rounded-md border border-gray-300 p-2" placeholder="District" readOnly={readOnly} required />
        <input name="registeredAssociationName" value={form.registeredAssociationName} onChange={handleChange} className="rounded-md border border-gray-300 p-2" placeholder="Registered association name" readOnly={readOnly} required />
        <select name="category" value={form.category} onChange={handleChange} className="rounded-md border border-gray-300 p-2" disabled={readOnly} required>
          <option value="">Select beauty shop category</option>
          <option value="GENTS_BARBER_SHOP_SALOON">Gents barber shop / saloon</option>
          <option value="LADY_BEAUTY_PARLOUR">Lady beauty parlour</option>
          <option value="MIXED_LARGE_CORPORATE">Mixed / large / corporate</option>
        </select>
        <input name="clusterName" value={form.clusterName} onChange={handleChange} className="rounded-md border border-gray-300 p-2" placeholder="Cluster name" readOnly={readOnly} required />
        <input name="state" value={form.state} onChange={handleChange} className="rounded-md border border-gray-300 p-2" placeholder="State" readOnly={readOnly} required />
        <input name="latitude" value={form.latitude} onChange={handleChange} className="rounded-md border border-gray-300 p-2" placeholder="Latitude" readOnly={readOnly} required />
        <input name="longitude" value={form.longitude} onChange={handleChange} className="rounded-md border border-gray-300 p-2" placeholder="Longitude" readOnly={readOnly} required />
        <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">WhatsApp number updates are handled only by admin support.</p>
        <input name="employeeCount" type="number" min="0" value={form.employeeCount} onChange={handleChange} className="rounded-md border border-gray-300 p-2" placeholder="Employee count" readOnly={readOnly} required />
        <input name="chairCount" type="number" min="0" value={form.chairCount} onChange={handleChange} className="rounded-md border border-gray-300 p-2" placeholder="Chair count" readOnly={readOnly} required />

        <button className="rounded-md border border-primaryGreen p-2 text-primaryGreen" type="button" onClick={getLocation} disabled={readOnly}>
          Get location from mobile
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button className="rounded-md bg-primaryGreen p-2 text-white disabled:opacity-60" type="submit" disabled={readOnly}>
            Save profile
          </button>
          <button
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700"
            type="button"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>
          <button className="rounded-md border border-primaryGreen p-2 text-primaryGreen" type="button" onClick={requestEdit}>
            Send request to edit to admin
          </button>
        </div>

        {locked && !editApproved && <p className="text-sm text-amber-700">Profile locked. Waiting for admin approval to edit.</p>}
        {editApproved && <p className="text-sm text-green-700">Admin approved edit. You can now update profile.</p>}
        {message && <p className="text-sm text-gray-700">{message}</p>}
      </form>
    </Layout>
  );
}
