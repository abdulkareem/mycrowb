import Layout from '../../components/layout/Layout';

export default function PaymentManagementPage() {
  return (
    <Layout title="Payment Management">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <p className="text-gray-700">Track collection payouts and issued receipts.</p>
        <div className="mt-4 flex gap-2">
          <button className="rounded-md bg-primaryGreen px-3 py-2 text-sm text-white">Release pending payouts</button>
          <button className="rounded-md border border-primaryGreen px-3 py-2 text-sm text-primaryGreen">Download payment report</button>
        </div>
      </section>
    </Layout>
  );
}
