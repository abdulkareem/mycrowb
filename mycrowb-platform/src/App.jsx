import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/public/HomePage';
import LoginPage from './pages/public/LoginPage';
import OtpPage from './pages/public/OtpPage';
import CertificateVerifyPage from './pages/public/CertificateVerifyPage';
import AboutPage from './pages/public/AboutPage';
import BarberDashboardPage from './pages/barber/BarberDashboardPage';
import CollectionHistoryPage from './pages/barber/CollectionHistoryPage';
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
import RequireRole from './components/auth/RequireRole';
import SuperAdminOverviewPage from './pages/admin/SuperAdminOverviewPage';
import AdminNumbersPage from './pages/admin/AdminNumbersPage';
import LoginActivitiesPage from './pages/admin/LoginActivitiesPage';
import AdminTotalPage from './pages/admin/AdminTotalPage';
import AdminFieldManagementPage from './pages/admin/AdminFieldManagementPage';
import TrackStaffPage from './pages/admin/TrackStaffPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/otp" element={<OtpPage />} />
      <Route path="/verify-certificate" element={<CertificateVerifyPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/barber/dashboard" element={<RequireRole roles={['BARBER']}><BarberDashboardPage /></RequireRole>} />
      <Route path="/barber/collections" element={<RequireRole roles={['BARBER']}><CollectionHistoryPage /></RequireRole>} />
      <Route path="/barber/certificates" element={<RequireRole roles={['BARBER']}><CertificatesPage /></RequireRole>} />
      <Route path="/barber/profile" element={<RequireRole roles={['BARBER']}><ProfilePage /></RequireRole>} />
      <Route path="/barber/rating" element={<RequireRole roles={['BARBER']}><ServiceRatingPage /></RequireRole>} />
      <Route path="/barber/notifications" element={<RequireRole roles={['BARBER']}><NotificationsPage /></RequireRole>} />
      <Route path="/staff/today-route" element={<RequireRole roles={['SERVICE_STAFF']}><TodayRoutePage /></RequireRole>} />
      <Route path="/staff/shop-map" element={<RequireRole roles={['SERVICE_STAFF']}><ShopMapViewPage /></RequireRole>} />
      <Route path="/staff/collection-confirm" element={<RequireRole roles={['SERVICE_STAFF']}><CollectionConfirmPage /></RequireRole>} />
      <Route path="/staff/payment-confirm" element={<RequireRole roles={['SERVICE_STAFF']}><PaymentConfirmPage /></RequireRole>} />
      <Route path="/admin/overview" element={<RequireRole roles={['ADMIN', 'SUPER_ADMIN']}><AdminOverviewPage /></RequireRole>} />
      <Route path="/admin/shops" element={<RequireRole roles={['ADMIN', 'SUPER_ADMIN']}><RegisteredShopsPage /></RequireRole>} />
      <Route path="/admin/csv-upload" element={<RequireRole roles={['ADMIN', 'SUPER_ADMIN']}><CsvUploadPage /></RequireRole>} />
      <Route path="/admin/collections" element={<RequireRole roles={['ADMIN', 'SUPER_ADMIN']}><CollectionManagementPage /></RequireRole>} />
      <Route path="/admin/payments" element={<RequireRole roles={['ADMIN', 'SUPER_ADMIN']}><PaymentManagementPage /></RequireRole>} />
      <Route path="/admin/staff" element={<RequireRole roles={['ADMIN', 'SUPER_ADMIN']}><CertificateIssuancePage /></RequireRole>} />
      <Route path="/admin/certificates" element={<RequireRole roles={['ADMIN', 'SUPER_ADMIN']}><CertificateIssuancePage /></RequireRole>} />
      <Route path="/admin/analytics" element={<RequireRole roles={['ADMIN', 'SUPER_ADMIN']}><AnalyticsDashboardPage /></RequireRole>} />
      <Route path="/admin/routes" element={<RequireRole roles={['ADMIN', 'SUPER_ADMIN']}><RouteOptimizationPage /></RequireRole>} />
      <Route path="/admin/ratings" element={<RequireRole roles={['ADMIN', 'SUPER_ADMIN']}><RatingsDashboardPage /></RequireRole>} />
      <Route path="/admin/total" element={<RequireRole roles={['ADMIN', 'SUPER_ADMIN']}><AdminTotalPage /></RequireRole>} />
      <Route path="/admin/fields" element={<RequireRole roles={['ADMIN', 'SUPER_ADMIN']}><AdminFieldManagementPage /></RequireRole>} />
      <Route path="/super-admin/overview" element={<RequireRole roles={['SUPER_ADMIN']}><SuperAdminOverviewPage /></RequireRole>} />
      <Route path="/super-admin/admin-numbers" element={<RequireRole roles={['SUPER_ADMIN']}><AdminNumbersPage /></RequireRole>} />
      <Route path="/super-admin/login-activities" element={<RequireRole roles={['SUPER_ADMIN']}><LoginActivitiesPage /></RequireRole>} />
      <Route path="/super-admin/track-staff" element={<RequireRole roles={['SUPER_ADMIN']}><TrackStaffPage /></RequireRole>} />
    </Routes>
  );
}
