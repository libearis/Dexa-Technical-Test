import { Navigate, Route, Routes } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { EmployeeDashboardPage } from './pages/employee/EmployeeDashboardPage';
import { AttendanceMonitoringPage } from './pages/hrd/AttendanceMonitoringPage';
import { DepartmentsPage } from './pages/hrd/DepartmentsPage';
import { EmployeesPage } from './pages/hrd/EmployeesPage';
import { HrdDashboardPage } from './pages/hrd/HrdDashboardPage';
import { HrdLayout } from './pages/hrd/HrdLayout';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './routes/ProtectedRoute';

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'HRD_ADMIN' ? '/hrd' : '/employee'} replace />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <>
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<HomeRedirect />} />

        <Route element={<ProtectedRoute allowedRoles={['EMPLOYEE']} />}>
          <Route path="/employee" element={<EmployeeDashboardPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['HRD_ADMIN']} />}>
          <Route path="/hrd" element={<HrdLayout />}>
            <Route index element={<HrdDashboardPage />} />
            <Route path="monitoring" element={<AttendanceMonitoringPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="departments" element={<DepartmentsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
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
