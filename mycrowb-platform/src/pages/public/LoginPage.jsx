import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import client from '../../api/client';

const roles = [
  { key: 'barber', label: 'Barber', dashboard: '/barber/dashboard' },
  { key: 'staff', label: 'Staff', dashboard: '/staff/today-route' },
  { key: 'admin', label: 'Admin', dashboard: '/admin/overview' }
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const roleFromQuery = searchParams.get('role');
  const defaultRole = roles.some((role) => role.key === roleFromQuery) ? roleFromQuery : 'barber';

  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [role, setRole] = useState(defaultRole);
  const [message, setMessage] = useState('');

  const selectedRole = useMemo(() => roles.find((item) => item.key === role), [role]);

  const requestOtp = async (event) => {
    event.preventDefault();
    setMessage('');
    if (!whatsappNumber.trim() || !selectedRole) {
      return;
    }

    try {
      await client.post('/auth/request-otp', { whatsappNumber, role: selectedRole.key });
      navigate('/otp', {
        state: {
          whatsappNumber,
          role: selectedRole.key,
          dashboard: selectedRole.dashboard
        }
      });
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to request OTP.');
    }
  };

  return (
    <Layout title="Login with WhatsApp OTP">
      <section className="max-w-lg rounded-xl bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-600">Select your role and continue using WhatsApp OTP verification.</p>
        <form className="mt-4 grid gap-4" onSubmit={requestOtp}>
          <label className="grid gap-1 text-sm font-medium text-gray-700">
            Role
            <select value={role} onChange={(event) => setRole(event.target.value)} className="rounded-md border border-gray-300 p-2">
              {roles.map((roleOption) => (
                <option key={roleOption.key} value={roleOption.key}>
                  {roleOption.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-medium text-gray-700">
            WhatsApp number
            <input
              value={whatsappNumber}
              onChange={(event) => setWhatsappNumber(event.target.value)}
              className="rounded-md border border-gray-300 p-2"
              placeholder="Enter your WhatsApp number"
              required
            />
          </label>

          <button className="rounded-md bg-primaryGreen p-2 text-white hover:bg-leafGreen" type="submit">
            Request OTP on WhatsApp
          </button>
        </form>

        <p className="mt-3 text-xs text-gray-500">OTP is sent only for registered WhatsApp numbers for the selected role.</p>
        {message && <p className="mt-2 text-sm text-red-600">{message}</p>}
        <Link to="/" className="mt-4 inline-block text-sm font-medium text-primaryGreen">
          ← Back to home
        </Link>
      </section>
    </Layout>
  );
}
