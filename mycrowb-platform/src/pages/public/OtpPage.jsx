import { useMemo, useState } from 'react';
import client from '../../api/client';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';

const roleLabels = {
  barber: 'Barber',
  staff: 'Staff',
  admin: 'Admin'
};

export default function OtpPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');

  const roleLabel = useMemo(() => roleLabels[state?.role] ?? 'User', [state?.role]);
  const dashboardPath = state?.dashboard ?? '/';

  const verifyOtp = async (event) => {
    event.preventDefault();
    setMessage('');

    if (!/^\d{6}$/.test(otp)) {
      setMessage('Please enter a valid 6 digit OTP.');
      return;
    }

    try {
      const response = await client.post('/auth/verify-otp', {
        whatsappNumber: state?.whatsappNumber,
        code: otp,
        role: state?.role
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate(dashboardPath);
    } catch (error) {
      setMessage(error.response?.data?.message || 'OTP verification failed.');
    }
  };

  return (
    <Layout title="OTP Verification">
      <section className="max-w-lg rounded-xl bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-600">
          WhatsApp: <span className="font-medium text-gray-800">{state?.whatsappNumber ?? 'Not provided'}</span>
        </p>
        <p className="text-sm text-gray-600">
          Role: <span className="font-medium text-gray-800">{roleLabel}</span>
        </p>

        <form className="mt-4 grid gap-3" onSubmit={verifyOtp}>
          <input
            value={otp}
            onChange={(event) => setOtp(event.target.value)}
            className="rounded-md border border-gray-300 p-2"
            placeholder="Enter any 6 digit OTP"
            required
            maxLength={6}
          />
          <button className="rounded-md bg-primaryGreen p-2 text-white hover:bg-leafGreen" type="submit">
            Verify OTP
          </button>
        </form>

        <p className="mt-3 text-xs text-gray-500">Demo mode: use the OTP received in SMS or server logs.</p>
        {message && <p className="mt-2 text-sm text-red-600">{message}</p>}
        <Link to="/login" className="mt-4 inline-block text-sm font-medium text-primaryGreen">
          ← Change WhatsApp number/role
        </Link>
      </section>
    </Layout>
  );
}
