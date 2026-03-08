import Layout from '../../components/layout/Layout';

export default function ServiceRatingPage() {
  return (
    <Layout title="Service Rating">
      <section className="max-w-2xl rounded-xl bg-white p-6 shadow-sm">
        <p className="text-gray-700">Rate the latest collection service to help improve operations.</p>
        <textarea className="mt-3 w-full rounded-md border border-gray-300 p-2" placeholder="Share your feedback" rows={4}></textarea>
        <button className="mt-3 rounded-md bg-primaryGreen px-3 py-2 text-sm text-white" type="button">Submit rating</button>
      </section>
    </Layout>
  );
}
