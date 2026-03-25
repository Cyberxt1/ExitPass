import { BrowserRouter, Route, Routes } from "react-router-dom";

import { LayoutWrapper } from "@/app/layout-wrapper";
import HomePage from "@/app/page";
import AboutPage from "@/app/about/page";
import AdminPortalPage from "@/app/admin/page";
import AdminLoginPage from "@/app/admin/login/page";
import AdminSignupPage from "@/app/admin/signup/page";
import AdminDashboardPage from "@/app/admin-dashboard/page";
import ChaplaincyPortalPage from "@/app/chaplaincy/page";
import ChaplaincyLoginPage from "@/app/chaplaincy/login/page";
import ChaplaincySignupPage from "@/app/chaplaincy/signup/page";
import DashboardPage from "@/app/dashboard/page";
import PassesPage from "@/app/dashboard/passes/page";
import ProfilePage from "@/app/dashboard/profile/page";
import RequestPassPage from "@/app/dashboard/request/page";
import FaqsPage from "@/app/faqs/page";
import ForgotPasswordPage from "@/app/forgot-password/page";
import HelpPage from "@/app/help/page";
import LoginPage from "@/app/login/page";
import SecurityPortalPage from "@/app/security/page";
import SecurityLoginPage from "@/app/security/login/page";
import SecuritySignupPage from "@/app/security/signup/page";
import SecurityScannerPage from "@/app/security-scanner/page";
import SignupPage from "@/app/signup/page";
import StaffJoinPage from "@/app/staff-join/page";

export function App() {
  return (
    <BrowserRouter>
      <LayoutWrapper>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/faqs" element={<FaqsPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/staff-join" element={<StaffJoinPage />} />

          <Route path="/admin" element={<AdminPortalPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/signup" element={<AdminSignupPage />} />
          <Route path="/chaplaincy" element={<ChaplaincyPortalPage />} />
          <Route path="/chaplaincy/login" element={<ChaplaincyLoginPage />} />
          <Route path="/chaplaincy/signup" element={<ChaplaincySignupPage />} />
          <Route path="/security" element={<SecurityPortalPage />} />
          <Route path="/security/login" element={<SecurityLoginPage />} />
          <Route path="/security/signup" element={<SecuritySignupPage />} />

          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/passes" element={<PassesPage />} />
          <Route path="/dashboard/profile" element={<ProfilePage />} />
          <Route path="/dashboard/request" element={<RequestPassPage />} />
          <Route path="/admin-dashboard" element={<AdminDashboardPage />} />
          <Route path="/security-scanner" element={<SecurityScannerPage />} />
        </Routes>
      </LayoutWrapper>
    </BrowserRouter>
  );
}
