import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth.jsx';
import { ThemeProvider, useTheme } from './hooks/useTheme.jsx';
import { BookProvider } from './hooks/bookContext';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Navbar from './components/Navbar.jsx';
import BottomHome from './components/BottomHome.jsx';

import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Transactions from './pages/Transactions.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';
import Admin from './pages/Admin.jsx';
import Profile from './pages/Profile.jsx';
import Cashbook from './pages/Cashbook.jsx';
import CashbookHome from './pages/CashbookHome.jsx';

function AppContent() {
  const { colors } = useTheme();
  const location = useLocation();

  const hidePaths = ['/login', '/signup', '/register', '/forgot-password', '/reset-password', '/cashbook'];
  const hideNavbar = hidePaths.some(p => location.pathname.startsWith(p));

  return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: colors.bg, color: colors.text }}>
      {!hideNavbar && <Navbar />}
      <div className="app-content" style={{ flex: 1, background: colors.bg }}>
        <Routes>
          <Route path="/login" element={<Login/>} />
          <Route path="/signup" element={<Signup/>} />
          <Route path="/forgot-password" element={<ForgotPassword/>} />
          <Route path="/cashbook" element={<ProtectedRoute><Cashbook/></ProtectedRoute>}>
            <Route index element={<CashbookHome/>} />
            <Route path="settings" element={<Settings/>} />
            <Route path="profile" element={<Profile/>} />
          </Route>
          <Route path="/" element={<ProtectedRoute><Dashboard/></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute><Transactions/></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports/></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings/></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile/></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><Admin/></ProtectedRoute>} />
        </Routes>
        {/* Bottom-left static Home button visible on core app pages and cashbook settings/profile */}
        {(location.pathname === '/' || ['/transactions','/reports','/cashbook/settings','/cashbook/profile'].some(p => location.pathname.startsWith(p))) && <BottomHome />}
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BookProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </BookProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
