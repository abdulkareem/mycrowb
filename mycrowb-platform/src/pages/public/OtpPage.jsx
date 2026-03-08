import { useMemo, useState } from 'react';
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

  const roleLabel = useMemo(() => roleLabels[state?.role] ?? 'User', [state?.role]);
  const dashboardPath = state?.dashboard ?? '/';

  const verifyOtp = (event) => {
    event.preventDefault();

    if (/^\d{6}$/.test(otp)) {
      navigate(dashboardPath);
    }
  };

  return (
    <Layout title="OTP Verification">
      <section className="max-w-lg rounded-xl bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-600">
          Mobile: <span className="font-medium text-gray-800">{state?.mobile ?? 'Not provided'}</span>
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

        <p className="mt-3 text-xs text-gray-500">Demo mode: any 6-digit OTP is accepted for all roles.</p>
        <Link to="/login" className="mt-4 inline-block text-sm font-medium text-primaryGreen">
          ← Change mobile/role
        </Link>
      </section>
    </Layout>
  );
}
