import Layout from '../../components/layout/Layout';

export default function ServiceRatingPage() {
  return (
    <Layout title="Service Rating">
      <textarea className='p-2 border rounded w-full max-w-xl' placeholder='Rate service'></textarea>
    </Layout>
  );
}
