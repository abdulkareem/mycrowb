import Layout from '../../components/layout/Layout';

export default function RatingsDashboardPage() {
  return (
    <Layout title="Ratings Dashboard">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <p className="text-gray-700">Quality monitoring based on barber feedback.</p>
        <div className="mt-4 rounded-md bg-lightGreen/40 p-3 text-sm text-gray-700">Average collection rating: 4.6 / 5</div>
      </section>
    </Layout>
  );
}
