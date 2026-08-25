import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './store/AuthContext';
import { RequireAdmin, SidebarLayout } from './components/SidebarLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import OnboardingRequests from './pages/OnboardingRequests';
import Restaurants from './pages/Restaurants';
import OnboardRestaurant from './pages/OnboardRestaurant';
import NumberChangeRequests from './pages/NumberChangeRequests';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <RequireAdmin>
              <SidebarLayout />
            </RequireAdmin>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/onboarding-requests" element={<OnboardingRequests />} />
          <Route path="/restaurants" element={<Restaurants />} />
          <Route path="/onboard" element={<OnboardRestaurant />} />
          <Route path="/number-changes" element={<NumberChangeRequests />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
