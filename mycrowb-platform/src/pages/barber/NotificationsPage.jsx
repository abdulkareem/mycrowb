import { useMemo } from 'react';
import Layout from '../../components/layout/Layout';

const BARBER_NOTIFICATION_KEY = 'mycrowb_barber_notifications';

export default function NotificationsPage() {
  const notifications = useMemo(() => {
    const value = JSON.parse(localStorage.getItem(BARBER_NOTIFICATION_KEY) || '[]');
    return value.slice().reverse();
  }, []);

  return (
    <Layout title="Notifications">
      <section className="max-w-2xl rounded-xl bg-white p-6 shadow-sm">
        <p className="text-gray-700">Latest updates for pickup windows, payments, and certification.</p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-gray-700">
          {notifications.map((item) => (
            <li key={item.id}>{item.message}</li>
          ))}
          {!notifications.length && <li>No new notifications yet.</li>}
        </ul>
      </section>
    </Layout>
  );
}
