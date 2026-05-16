import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import PasswordSetup from './pages/auth/PasswordSetup';
import SetPassword from './pages/SetPassword';
import AdminLayout from './components/layout/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminOrganizations from './pages/admin/Organizations';
import AdminLabs from './pages/admin/Labs';
import EditLab from './pages/admin/EditLab';
import AdminSchedule from './pages/admin/Schedule';
import AdminAssignment from './pages/admin/Assignment';
import AdminReports from './pages/admin/Reports';
import AdminUsers from './pages/admin/Users';

import PartnerLayout from './components/layout/PartnerLayout';
import PartnerDashboard from './pages/partner/Dashboard';
import StudentForm from './pages/partner/StudentForm';
import CsvUpload from './pages/partner/CsvUpload';
import PartnerOnboarding from './pages/partner/Onboarding';
import PartnerStudents from './pages/partner/Students';
import PartnerDemographics from './pages/partner/Demographics';
import PartnerLabPicks from './pages/partner/LabPicks';
import PartnerSchedule from './pages/partner/Schedule';

import EducatorLayout from './components/layout/EducatorLayout';
import EducatorRoster from './pages/educator/Roster';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/password-setup" element={<PasswordSetup />} />
            <Route path="/set-password" element={<SetPassword />} />
          </Route>

          {/* Master Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['master_admin']} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/organizations" element={<AdminOrganizations />} />
              <Route path="/admin/labs" element={<AdminLabs />} />
              <Route path="/admin/labs/:id/edit" element={<EditLab />} />
              <Route path="/admin/labs/new" element={<EditLab />} />
              <Route path="/admin/schedule" element={<AdminSchedule />} />
              <Route path="/admin/assignment" element={<AdminAssignment />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/users" element={<AdminUsers />} />
            </Route>
          </Route>

          {/* Partner Routes */}
          <Route element={<ProtectedRoute allowedRoles={['partner']} />}>
            <Route path="/partner/onboarding" element={<PartnerOnboarding />} />
            <Route element={<PartnerLayout />}>
              <Route path="/partner/dashboard" element={<PartnerDashboard />} />
              <Route path="/partner/students" element={<PartnerStudents />} />
              <Route path="/partner/demographics" element={<PartnerDemographics />} />
              <Route path="/partner/lab-picks" element={<PartnerLabPicks />} />
              <Route path="/partner/schedule" element={<PartnerSchedule />} />
              <Route path="/partner/upload" element={<CsvUpload />} />
              <Route path="/partner/students/new" element={<StudentForm />} />
              <Route path="/partner/students/:id/edit" element={<StudentForm />} />
            </Route>
          </Route>

          {/* Educator Routes */}
          <Route element={<ProtectedRoute allowedRoles={['educator']} />}>
            <Route element={<EducatorLayout />}>
              <Route path="/educator/roster" element={<EducatorRoster />} />
            </Route>
          </Route>

          {/* Redirect root to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
