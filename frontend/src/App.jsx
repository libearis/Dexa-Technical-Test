import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { AppLayout } from './layouts/AppLayout';
import { AttendanceHistoryPage } from './pages/attendance/AttendanceHistoryPage';
import { AttendancePage } from './pages/attendance/AttendancePage';
import { AttendanceMonitoringPage } from './pages/hrd/AttendanceMonitoringPage';
import { DepartmentsPage } from './pages/hrd/DepartmentsPage';
import { EmployeesPage } from './pages/hrd/EmployeesPage';
import { HrdDashboardPage } from './pages/hrd/HrdDashboardPage';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './routes/ProtectedRoute';

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'HRD_ADMIN' ? '/dashboard' : '/attendance'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<HomeRedirect />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/history" element={<AttendanceHistoryPage />} />

          <Route element={<ProtectedRoute allowedRoles={['HRD_ADMIN']} />}>
            <Route path="/dashboard" element={<HrdDashboardPage />} />
            <Route path="/monitoring" element={<AttendanceMonitoringPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/departments" element={<DepartmentsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
