import { useMemo, useState } from 'react';
import client from '../../api/client';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';

const roleLabels = {
  barber: 'Hair Stylist',
  staff: 'Staff',
  admin: 'Admin'
};

function getBrowserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({});
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve({}),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}

export default function OtpPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);

  const roleLabel = useMemo(() => roleLabels[state?.role] ?? 'User', [state?.role]);
  const dashboardPath = state?.dashboard ?? '/';
  const isPinMode = state?.mode === 'pin';

  const login = async (event) => {
    event.preventDefault();
    setMessage('');

    if (!/^\d{6}$/.test(code)) {
      setMessage(`Please enter a valid 6 digit ${isPinMode ? 'PIN' : 'OTP'}.`);
      return;
    }

    try {
      const location = await getBrowserLocation();
      const endpoint = isPinMode ? '/auth/login-pin' : '/auth/verify-otp';
      const payload = {
        whatsappNumber: state?.whatsappNumber,
        role: state?.role,
        ...location
      };

      if (isPinMode) payload.pin = code;
      else payload.code = code;

      const response = await client.post(endpoint, payload);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      if (response.data.sessionId) localStorage.setItem('sessionId', response.data.sessionId);
      navigate(dashboardPath);
    } catch (error) {
      const nextAttempts = error.response?.data?.attempts ?? attempts;
      setAttempts(nextAttempts);
      if (error.response?.data?.requiresPinReset) setLocked(true);
      setMessage(error.response?.data?.message || `${isPinMode ? 'PIN' : 'OTP'} verification failed.`);
    }
  };

  const requestNewPin = async () => {
    setMessage('');
    try {
      await client.post('/auth/request-otp', { whatsappNumber: state?.whatsappNumber, role: state?.role });
      setCode('');
      setAttempts(0);
      setLocked(false);
      setMessage('New PIN has been sent to your WhatsApp number.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to request new PIN.');
    }
  };

  return (
    <Layout title={isPinMode ? 'PIN Login' : 'OTP Verification'}>
      <section className="max-w-lg rounded-xl bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-600">
          WhatsApp: <span className="font-medium text-gray-800">{state?.whatsappNumber ?? 'Not provided'}</span>
        </p>
        <p className="text-sm text-gray-600">
          Role: <span className="font-medium text-gray-800">{roleLabel}</span>
        </p>

        <form className="mt-4 grid gap-3" onSubmit={login}>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="rounded-md border border-gray-300 p-2"
            placeholder={isPinMode ? 'Enter 6 digit PIN' : 'Enter 6 digit OTP'}
            required
            maxLength={6}
          />
          {!locked && (
            <button className="rounded-md bg-primaryGreen p-2 text-white hover:bg-leafGreen" type="submit">
              {isPinMode ? 'Login' : 'Verify OTP'}
            </button>
          )}
        </form>

        {isPinMode && locked && (
          <button type="button" onClick={requestNewPin} className="mt-3 rounded-md bg-primaryGreen p-2 text-white hover:bg-leafGreen">
            Request New PIN on WhatsApp
          </button>
        )}

        {isPinMode && attempts > 0 && !locked && (
          <p className="mt-2 text-xs text-amber-700">Failed attempts: {attempts}/4</p>
        )}

        {message && <p className="mt-2 text-sm text-red-600">{message}</p>}
        <Link to="/login" className="mt-4 inline-block text-sm font-medium text-primaryGreen">
          ← Change WhatsApp number/role
        </Link>
      </section>
    </Layout>
  );
}
