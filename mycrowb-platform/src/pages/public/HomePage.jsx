import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';

const featureCards = [
  {
    title: 'For hair & beauty establishments',
    description: 'Track collection history, download receipts, and monitor eco-impact from one dashboard.',
    to: '/login?role=barber',
    cta: 'Hair Stylist login'
  },
  {
    title: 'For collection staff',
    description: 'Follow daily routes, confirm pickups, and keep collection operations up to date in real time.',
    to: '/login?role=staff',
    cta: 'Staff login'
  },
  {
    title: 'For admins',
    description: 'Oversee shops, analytics, certificates, and payments with centralized operational controls.',
    to: '/login?role=admin',
    cta: 'Admin login'
  }
];

export default function HomePage() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [iosInstallHintVisible, setIosInstallHintVisible] = useState(false);

  useEffect(() => {
    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    if (isIos && !isStandalone) {
      setIosInstallHintVisible(true);
    }

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    };
  }, []);

  const canShowInstallButton = useMemo(() => Boolean(deferredPrompt), [deferredPrompt]);

  const installApp = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <Layout title="Eco-recycling platform" showLogout={false}>
      <section className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
        <p className="text-lg text-gray-700">
          MYCROWB connects hair & beauty establishments to a sustainable hair waste collection network and turns waste into measurable environmental impact.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/about" className="rounded-md bg-primaryGreen px-4 py-2 text-sm font-medium text-white hover:bg-leafGreen">
            Learn more
          </Link>
          <Link to="/verify-certificate" className="rounded-md border border-primaryGreen px-4 py-2 text-sm font-medium text-primaryGreen hover:bg-lightGreen/30">
            Verify certificate
          </Link>
          {canShowInstallButton ? (
            <button type="button" onClick={installApp} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
              Install app
            </button>
          ) : null}
        </div>
        {iosInstallHintVisible ? (
          <p className="text-sm text-gray-500">
            On iPhone/iPad, tap the share icon in Safari and choose <span className="font-medium">Add to Home Screen</span> to install MYCROWB.
          </p>
        ) : null}
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
