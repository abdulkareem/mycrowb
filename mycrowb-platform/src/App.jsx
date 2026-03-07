import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/public/HomePage';
import LoginPage from './pages/public/LoginPage';
import OtpPage from './pages/public/OtpPage';
import CertificateVerifyPage from './pages/public/CertificateVerifyPage';
import AboutPage from './pages/public/AboutPage';
import BarberDashboardPage from './pages/barber/BarberDashboardPage';
import CollectionHistoryPage from './pages/barber/CollectionHistoryPage';
import ReceiptDownloadsPage from './pages/barber/ReceiptDownloadsPage';
import CertificatesPage from './pages/barber/CertificatesPage';
import ProfilePage from './pages/barber/ProfilePage';
import ServiceRatingPage from './pages/barber/ServiceRatingPage';
import NotificationsPage from './pages/barber/NotificationsPage';
import TodayRoutePage from './pages/staff/TodayRoutePage';
import ShopMapViewPage from './pages/staff/ShopMapViewPage';
import CollectionConfirmPage from './pages/staff/CollectionConfirmPage';
import PaymentConfirmPage from './pages/staff/PaymentConfirmPage';
import AdminOverviewPage from './pages/admin/AdminOverviewPage';
import RegisteredShopsPage from './pages/admin/RegisteredShopsPage';
import CsvUploadPage from './pages/admin/CsvUploadPage';
import CollectionManagementPage from './pages/admin/CollectionManagementPage';
import PaymentManagementPage from './pages/admin/PaymentManagementPage';
import CertificateIssuancePage from './pages/admin/CertificateIssuancePage';
import AnalyticsDashboardPage from './pages/admin/AnalyticsDashboardPage';
import RouteOptimizationPage from './pages/admin/RouteOptimizationPage';
import RatingsDashboardPage from './pages/admin/RatingsDashboardPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/otp" element={<OtpPage />} />
      <Route path="/verify-certificate" element={<CertificateVerifyPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/barber/dashboard" element={<BarberDashboardPage />} />
      <Route path="/barber/collections" element={<CollectionHistoryPage />} />
      <Route path="/barber/receipts" element={<ReceiptDownloadsPage />} />
      <Route path="/barber/certificates" element={<CertificatesPage />} />
      <Route path="/barber/profile" element={<ProfilePage />} />
      <Route path="/barber/rating" element={<ServiceRatingPage />} />
      <Route path="/barber/notifications" element={<NotificationsPage />} />
      <Route path="/staff/today-route" element={<TodayRoutePage />} />
      <Route path="/staff/shop-map" element={<ShopMapViewPage />} />
      <Route path="/staff/collection-confirm" element={<CollectionConfirmPage />} />
      <Route path="/staff/payment-confirm" element={<PaymentConfirmPage />} />
      <Route path="/admin/overview" element={<AdminOverviewPage />} />
      <Route path="/admin/shops" element={<RegisteredShopsPage />} />
      <Route path="/admin/csv-upload" element={<CsvUploadPage />} />
      <Route path="/admin/collections" element={<CollectionManagementPage />} />
      <Route path="/admin/payments" element={<PaymentManagementPage />} />
      <Route path="/admin/certificates" element={<CertificateIssuancePage />} />
      <Route path="/admin/analytics" element={<AnalyticsDashboardPage />} />
      <Route path="/admin/routes" element={<RouteOptimizationPage />} />
      <Route path="/admin/ratings" element={<RatingsDashboardPage />} />
    </Routes>
  );
}
