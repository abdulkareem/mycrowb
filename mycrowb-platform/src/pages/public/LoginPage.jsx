import Layout from '../../components/layout/Layout';

export default function LoginPage() {
  return (
    <Layout title="Login">
      <form className='grid gap-3 max-w-md'><input className='p-2 border rounded' placeholder='Mobile' /><button className='bg-primaryGreen text-white rounded p-2'>Request OTP</button></form>
    </Layout>
  );
}
