import Layout from '../../components/layout/Layout';

export default function ReceiptDownloadsPage() {
  return (
    <Layout title="Receipt Downloads">
      <section className="max-w-2xl rounded-xl bg-white p-6 shadow-sm">
        <p className="text-gray-700">Download payment receipts generated after each successful payment cycle.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-md bg-primaryGreen px-3 py-2 text-sm text-white">Download Jan receipt</button>
          <button className="rounded-md bg-primaryGreen px-3 py-2 text-sm text-white">Download Feb receipt</button>
          <button className="rounded-md bg-primaryGreen px-3 py-2 text-sm text-white">Download Mar receipt</button>
        </div>
      </section>
    </Layout>
  );
}
