import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';

const PATENT_CERTIFICATE_JPG_URL =
  "https://raw.githubusercontent.com/abdulkareem/mycrowb/main/mycrowb-backend/src/assets/Patent_hair_kareem_page-0001.jpg";

export default function AboutPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/');
  };

  return (
    <Layout title="About Mycrowb">
      <div className="space-y-8">
        <p>MYCROWB YOUR ECO FRIEND LLP converts salon hair waste into circular economy eco-products.</p>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-primaryGreen">Watch Our Story</h2>
          <div className="aspect-video w-full overflow-hidden rounded-lg shadow">
            <iframe
              className="h-full w-full"
              src="https://www.youtube.com/embed/ejrjf6hkG88"
              title="About Mycrowb Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-primaryGreen">Patent Certificate</h2>
          <img
            src={PATENT_CERTIFICATE_JPG_URL}
            alt="Government of India patent certificate for Mycrowb innovation"
            className="w-full rounded-lg border border-gray-200 shadow"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
          />
        </section>
      </div>
    </Layout>
  );
}
