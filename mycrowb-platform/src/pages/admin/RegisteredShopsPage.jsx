import Layout from '../../components/layout/Layout';

export default function RegisteredShopsPage() {
  return (
    <Layout title="Registered Shops">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <p className="text-gray-700">Manage active/inactive barber shops and geolocation data.</p>
        <div className="mt-4 flex gap-2">
          <button className="rounded-md bg-primaryGreen px-3 py-2 text-sm text-white">Add new shop</button>
          <button className="rounded-md border border-primaryGreen px-3 py-2 text-sm text-primaryGreen">Export list</button>
        </div>
      </section>
    </Layout>
  );
}
