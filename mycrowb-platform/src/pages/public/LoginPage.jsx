import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import client from '../../api/client';

const BUSINESS_NUMBER = import.meta.env.VITE_BUSINESS_WHATSAPP_NUMBER || '919744917623';
const DEVICE_ID_KEY = 'mycrowbDeviceId';

const roleDashboard = {
  admin: '/admin/overview',
  staff: '/staff/today-route',
  stylist: '/barber/dashboard'
};

function getDeviceId() {
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const generated = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState('');
  const [pin, setPin] = useState('');
  const [code, setCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [registration, setRegistration] = useState({
    name: '',
    shopName: '',
    address: '',
    district: '',
    state: '',
    whatsapp: ''
  });
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [userState, setUserState] = useState({ checked: false, exists: null, firstLogin: false, role: 'stylist', verified: false });

  const buttonText = useMemo(() => {
    if (!userState.checked) return 'CHECK USER';
    if (!userState.exists) return 'REGISTER NEW USER';
    if (userState.exists && userState.firstLogin && !userState.verified) return 'VERIFY ACCOUNT';
    if (userState.exists && userState.firstLogin && userState.verified) return 'SET PIN';
    return 'LOGIN';
  }, [userState]);

  const checkUser = async () => {
    if (!mobile.trim()) return;

    setLoading(true);
    setMessage('');
    try {
      const response = await client.get('/auth/check-user', { params: { mobile } });
      if (!response.data.exists) {
        setUserState({ checked: true, exists: false, firstLogin: false, role: 'stylist', verified: false });
        return;
      }

      setUserState({
        checked: true,
        exists: true,
        firstLogin: Boolean(response.data.firstLogin),
        role: response.data.role,
        verified: false
      });
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to check user.');
    } finally {
      setLoading(false);
    }
  };

  const startWhatsappVerification = async () => {
    window.open(`https://wa.me/${BUSINESS_NUMBER}?text=Hi`, '_blank', 'noopener,noreferrer');
  };

  const submitCode = async () => {
    setLoading(true);
    setMessage('');
    try {
      await client.post('/auth/verify-code', { mobile, code });
      setUserState((prev) => ({ ...prev, verified: true }));
      setMessage('Code verified. Set your 4 digit PIN.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  const setPinAndLogin = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await client.post('/auth/set-pin', { mobile, pin: newPin, deviceId: getDeviceId() });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate(roleDashboard[userState.role] || '/');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to set PIN.');
    } finally {
      setLoading(false);
    }
  };

  const loginWithPin = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await client.post('/auth/device-login', { mobile, pin, deviceId: getDeviceId() });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate(roleDashboard[userState.role] || '/');
    } catch (error) {
      if (error.response?.data?.requiresVerification) {
        setUserState((prev) => ({ ...prev, firstLogin: true, verified: false }));
      }
      setMessage(error.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setMessage('Geolocation is not supported in this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setMessage('Location captured successfully.');
      },
      () => setMessage('Unable to access GPS location.')
    );
  };

  const submitRegistration = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await client.post('/registration/request', {
        mobile,
        ...registration,
        latitude: location.latitude,
        longitude: location.longitude
      });
      setMessage(response.data.message || 'Registration submitted. Waiting for admin approval.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to submit registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="MyCrowb Login" showLogout={false}>
      <section className="max-w-xl rounded-xl bg-white p-6 shadow-sm">
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm font-medium text-gray-700">
            Mobile Number
            <input value={mobile} onChange={(e) => setMobile(e.target.value)} className="rounded-md border border-gray-300 p-2" placeholder="Enter mobile number" />
          </label>

          <button type="button" onClick={checkUser} className="rounded-md bg-primaryGreen p-2 text-white hover:bg-leafGreen" disabled={loading}>
            CHECK USER
          </button>

          {userState.checked && userState.exists && !userState.firstLogin && (
            <>
              <label className="grid gap-1 text-sm font-medium text-gray-700">
                PIN (4 digits)
                <input value={pin} onChange={(e) => setPin(e.target.value)} maxLength={4} className="rounded-md border border-gray-300 p-2" placeholder="Enter PIN" />
              </label>
              <button type="button" onClick={loginWithPin} className="rounded-md bg-primaryGreen p-2 text-white hover:bg-leafGreen" disabled={loading}>
                {buttonText}
              </button>
            </>
          )}

          {userState.checked && userState.exists && userState.firstLogin && !userState.verified && (
            <>
              <button type="button" onClick={startWhatsappVerification} className="rounded-md bg-primaryGreen p-2 text-white hover:bg-leafGreen" disabled={loading}>
                {buttonText}
              </button>
              <label className="grid gap-1 text-sm font-medium text-gray-700">
                Verification Code
                <input value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} className="rounded-md border border-gray-300 p-2" placeholder="Enter code from WhatsApp" />
              </label>
              <button type="button" onClick={submitCode} className="rounded-md border border-primaryGreen p-2 font-medium text-primaryGreen hover:bg-lightGreen/50" disabled={loading}>
                Verify WhatsApp
              </button>
            </>
          )}

          {userState.checked && userState.exists && userState.firstLogin && userState.verified && (
            <>
              <label className="grid gap-1 text-sm font-medium text-gray-700">
                Set New PIN (4 digits)
                <input value={newPin} onChange={(e) => setNewPin(e.target.value)} maxLength={4} className="rounded-md border border-gray-300 p-2" placeholder="Create new PIN" />
              </label>
              <button type="button" onClick={setPinAndLogin} className="rounded-md bg-primaryGreen p-2 text-white hover:bg-leafGreen" disabled={loading}>
                {buttonText}
              </button>
            </>
          )}

          {userState.checked && !userState.exists && (
            <div className="grid gap-2 rounded-md border border-gray-200 p-3">
              <p className="text-sm font-semibold text-gray-700">New User Registration</p>
              <input className="rounded-md border border-gray-300 p-2" placeholder="Full Name" value={registration.name} onChange={(e) => setRegistration((prev) => ({ ...prev, name: e.target.value }))} />
              <input className="rounded-md border border-gray-300 p-2" placeholder="Beauty Shop Name" value={registration.shopName} onChange={(e) => setRegistration((prev) => ({ ...prev, shopName: e.target.value }))} />
              <input className="rounded-md border border-gray-300 p-2" placeholder="Address" value={registration.address} onChange={(e) => setRegistration((prev) => ({ ...prev, address: e.target.value }))} />
              <input className="rounded-md border border-gray-300 p-2" placeholder="District" value={registration.district} onChange={(e) => setRegistration((prev) => ({ ...prev, district: e.target.value }))} />
              <input className="rounded-md border border-gray-300 p-2" placeholder="State" value={registration.state} onChange={(e) => setRegistration((prev) => ({ ...prev, state: e.target.value }))} />
              <input className="rounded-md border border-gray-300 p-2" placeholder="WhatsApp Number" value={registration.whatsapp} onChange={(e) => setRegistration((prev) => ({ ...prev, whatsapp: e.target.value }))} />
              <button type="button" onClick={captureLocation} className="rounded-md border border-primaryGreen p-2 text-primaryGreen hover:bg-lightGreen/50">Capture GPS Location</button>
              <button type="button" onClick={submitRegistration} className="rounded-md bg-primaryGreen p-2 text-white hover:bg-leafGreen" disabled={loading}>
                {buttonText}
              </button>
            </div>
          )}
        </div>

        {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}
        <Link to="/" className="mt-4 inline-block text-sm font-medium text-primaryGreen">← Back to home</Link>
      </section>
    </Layout>
  );
}
