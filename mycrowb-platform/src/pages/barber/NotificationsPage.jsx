import Layout from '../../components/layout/Layout';

export default function NotificationsPage() {
  return (
    <Layout title="Notifications">
      <section className="max-w-2xl rounded-xl bg-white p-6 shadow-sm">
        <p className="text-gray-700">Latest updates for pickup windows, payments, and certification.</p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-gray-700">
          <li>Tomorrow pickup slot confirmed for 10:30 AM.</li>
          <li>Payment receipt for February is ready to download.</li>
          <li>New sustainability certificate was issued.</li>
        </ul>
      </section>
    </Layout>
  );
}
