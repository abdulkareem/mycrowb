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

        {Object.entries(form).map(([name, value]) => (
          <input
            key={name}
            name={name}
            value={value}
            onChange={handleChange}
            className="rounded-md border border-gray-300 p-2"
            placeholder={name}
            readOnly={readOnly}
            required
          />
        ))}

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
