import Layout from '../../components/layout/Layout';

export default function ProfilePage() {
  return (
    <Layout title="Profile">
      <form className="max-w-2xl rounded-xl bg-white p-6 shadow-sm grid gap-3">
        <p className="text-gray-700">Manage shop address, coordinates, and owner details.</p>
        <input className="rounded-md border border-gray-300 p-2" placeholder="Shop name" defaultValue="Green Cut" />
        <input className="rounded-md border border-gray-300 p-2" placeholder="Owner mobile" defaultValue="9876543210" />
        <input className="rounded-md border border-gray-300 p-2" placeholder="Address" defaultValue="MG Road, Bengaluru" />
        <button className="rounded-md bg-primaryGreen p-2 text-white" type="button">Save profile</button>
      </form>
    </Layout>
  );
}
