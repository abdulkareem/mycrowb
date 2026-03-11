import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { markNotificationsAsSeen, readAndPruneNotifications } from '../../utils/barberNotifications';

export default function NotificationsPage() {
  const notifications = useMemo(() => {
    const value = readAndPruneNotifications();
    markNotificationsAsSeen();
    return value.slice().reverse();
  }, []);

  return (
    <Layout title="Notifications">
      <section className="max-w-2xl rounded-xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-gray-700">Latest updates for pickup windows, payments, and certification.</p>
          <Link className="rounded-md border border-primaryGreen px-3 py-2 text-sm text-primaryGreen" to="/barber/dashboard">← Back</Link>
        </div>
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
