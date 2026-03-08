import Layout from '../../components/layout/Layout';

export default function CollectionConfirmPage() {
  return (
    <Layout title="Collection Confirmation">
      <form className="max-w-2xl rounded-xl bg-white p-6 shadow-sm grid gap-3">
        <p className="text-gray-700">Upload hair weight and image proof per stop.</p>
        <input className="rounded-md border border-gray-300 p-2" placeholder="Shop name" defaultValue="Green Cut" />
        <input className="rounded-md border border-gray-300 p-2" placeholder="Collected weight (kg)" />
        <input className="rounded-md border border-gray-300 p-2" type="file" />
        <button className="rounded-md bg-primaryGreen p-2 text-white" type="button">Confirm collection</button>
      </form>
    </Layout>
  );
}
