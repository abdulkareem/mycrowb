import Layout from '../../components/layout/Layout';

export default function CertificateIssuancePage() {
  return (
    <Layout title="Certificate Issuance">
      <section className="max-w-2xl rounded-xl bg-white p-6 shadow-sm">
        <p className="text-gray-700">Issue verifiable QR certificates by shop and period.</p>
        <input className="mt-4 w-full rounded-md border border-gray-300 p-2" placeholder="Shop name" />
        <button className="mt-3 rounded-md bg-primaryGreen px-3 py-2 text-sm text-white" type="button">Generate certificate</button>
      </section>
    </Layout>
  );
}
