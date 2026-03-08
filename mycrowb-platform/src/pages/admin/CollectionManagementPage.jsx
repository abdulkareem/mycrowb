import Layout from '../../components/layout/Layout';

export default function CollectionManagementPage() {
  return (
    <Layout title="Collection Management">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <p className="text-gray-700">Monitor pending, collected, and missed pickups.</p>
        <div className="mt-4 grid gap-2 text-sm text-gray-700 sm:grid-cols-3">
          <div className="rounded-md bg-lightGreen/40 p-3">Pending: 18</div>
          <div className="rounded-md bg-lightGreen/40 p-3">Collected: 126</div>
          <div className="rounded-md bg-lightGreen/40 p-3">Missed: 4</div>
        </div>
      </section>
    </Layout>
  );
}
