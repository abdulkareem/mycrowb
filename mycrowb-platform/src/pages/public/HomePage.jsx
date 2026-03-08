import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';

const featureCards = [
  {
    title: 'For barber shops',
    description: 'Track collection history, download receipts, and monitor eco-impact from one dashboard.',
    to: '/login',
    cta: 'Barber login'
  },
  {
    title: 'For collection staff',
    description: 'Follow daily routes, confirm pickups, and keep collection operations up to date in real time.',
    to: '/staff/today-route',
    cta: 'View staff route'
  },
  {
    title: 'For admins',
    description: 'Oversee shops, analytics, certificates, and payments with centralized operational controls.',
    to: '/admin/overview',
    cta: 'Open admin overview'
  }
];

export default function HomePage() {
  return (
    <Layout title="Eco-recycling platform">
      <section className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
        <p className="text-lg text-gray-700">
          MYCROWB connects barber shops to a sustainable hair waste collection network and turns waste into measurable environmental impact.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/about" className="rounded-md bg-primaryGreen px-4 py-2 text-sm font-medium text-white hover:bg-leafGreen">
            Learn more
          </Link>
          <Link to="/verify-certificate" className="rounded-md border border-primaryGreen px-4 py-2 text-sm font-medium text-primaryGreen hover:bg-lightGreen/30">
            Verify certificate
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {featureCards.map((card) => (
          <article key={card.title} className="rounded-xl bg-white p-5 shadow-sm">
            <h3 className="font-heading text-lg text-gray-900">{card.title}</h3>
            <p className="mt-2 text-sm text-gray-600">{card.description}</p>
            <Link to={card.to} className="mt-4 inline-block text-sm font-medium text-primaryGreen hover:text-leafGreen">
              {card.cta} →
            </Link>
          </article>
        ))}
      </section>
    </Layout>
  );
}
