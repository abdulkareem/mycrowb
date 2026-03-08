import Layout from '../../components/layout/Layout';

export default function RouteOptimizationPage() {
  return (
    <Layout title="Route Optimization Dashboard">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <p className="text-gray-700">Generate route batches for service teams.</p>
        <div className="mt-4 flex gap-2">
          <button className="rounded-md bg-primaryGreen px-3 py-2 text-sm text-white">Generate today routes</button>
          <button className="rounded-md border border-primaryGreen px-3 py-2 text-sm text-primaryGreen">Send to staff app</button>
        </div>
      </section>
    </Layout>
  );
}
