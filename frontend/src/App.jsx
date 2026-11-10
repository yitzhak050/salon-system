import React, { createContext, useState, useContext } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import AdminShifts from './pages/AdminShifts';
import ReportsPage from './pages/ReportsPage';
import TaskManagement from './pages/TaskManagement';
import UserManagement from './pages/UserManagement';
import VolunteerPortal from './pages/VolunteerPortal';
import VolunteerTasks from './pages/VolunteerTasks';
import UserProfile from './pages/UserProfile';
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import { getStoredToken, saveAuthToken, clearAuthToken } from './services/api';
import { Box, Typography, Button, Paper } from '@mui/material';

export const AuthContext = createContext(null);

function decodeUserFromToken(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      clearAuthToken();
      return null;
    }
    return {
      user_id: payload.sub,
      role: payload.role,
      name: payload.name || 'משתמש'
    };
  } catch (e) {
    clearAuthToken();
    return null;
  }
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 500, borderRadius: 2, border: '1px solid #ffcdd2' }}>
            <Typography variant="h5" color="error.main" fontWeight="bold" gutterBottom>
              אירעה שגיאה בטעינת העמוד
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {this.state.error?.message || 'אנא נסה לרענן את העמוד או לחזור לדף הראשי.'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button variant="contained" color="primary" onClick={() => window.location.reload()}>
                רענן עמוד
              </Button>
              <Button variant="outlined" onClick={() => { this.setState({ hasError: false }); window.location.href = '/'; }}>
                חזור לדף הבית
              </Button>
            </Box>
          </Paper>
        </Box>
      );
    }
    return this.props.children;
  }
}

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const Layout = ({ children }) => {
  const { user } = useContext(AuthContext);
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f8fafc', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        {user && <Navbar />}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 1.5, sm: 3 },
            mt: { xs: 7, sm: 8 },
            mr: { xs: 0, md: user ? '240px' : 0 },
            width: { xs: '100%', md: user ? 'calc(100% - 240px)' : '100%' },
            transition: 'margin-right 0.2s',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <ErrorBoundary>
            <Box sx={{ flexGrow: 1 }}>
              {children}
            </Box>
          </ErrorBoundary>

          {/* Footer present on all system screens */}
          <Box
            component="footer"
            className="no-print"
            sx={{
              py: 2.5,
              mt: 'auto',
              textAlign: 'center',
              borderTop: '1px solid #e2e8f0',
              bgcolor: 'transparent'
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
              נבנה ליוצאים לשינוי על ידי{' '}
              <a
                href="mailto:Yitzchak.gross@gmail.com"
                style={{ color: '#1976d2', textDecoration: 'none', fontWeight: 600 }}
              >
                יצחק גרוס
              </a>
            </Typography>
          </Box>
        </Box>
        {user && <Sidebar />}
      </Box>
    </Box>
  );
};


function App() {
  // Initialize synchronously from localStorage or 30-day cookie so PWA/page refresh stays logged in
  const [user, setUser] = useState(() => decodeUserFromToken(getStoredToken()));
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setMobileOpen(prev => !prev);
  };

  const handleLogin = (token, rememberForMonth = true) => {
    saveAuthToken(token, rememberForMonth);
    const decoded = decodeUserFromToken(token);
    setUser(decoded);
    if (decoded?.role === 'SALON_MANAGER') {
      navigate('/admin');
    } else {
      navigate('/volunteer');
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, setUser, handleLogin, handleLogout, mobileOpen, setMobileOpen, toggleSidebar }}>
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/" element={
          <ProtectedRoute>
            {user?.role === 'SALON_MANAGER' ? 
              <Navigate to="/admin" replace /> : 
              <Navigate to="/volunteer" replace />
            }
          </ProtectedRoute>
        } />
        
        {/* נתיבי מנהל בלבד (SALON_MANAGER) */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['SALON_MANAGER']}>
            <Layout><AdminDashboard /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/shifts" element={
          <ProtectedRoute allowedRoles={['SALON_MANAGER']}>
            <Layout><AdminShifts /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/reports" element={
          <ProtectedRoute allowedRoles={['SALON_MANAGER']}>
            <Layout><ReportsPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/tasks" element={
          <ProtectedRoute allowedRoles={['SALON_MANAGER']}>
            <Layout><TaskManagement /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute allowedRoles={['SALON_MANAGER']}>
            <Layout><UserManagement /></Layout>
          </ProtectedRoute>
        } />

        {/* נתיבי מתנדב ומפעיל סלון */}
        <Route path="/volunteer" element={
          <ProtectedRoute allowedRoles={['EVENT_VOLUNTEER', 'SALON_OPERATOR', 'SALON_MANAGER']}>
            <Layout><VolunteerPortal /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/volunteer/tasks" element={
          <ProtectedRoute allowedRoles={['EVENT_VOLUNTEER', 'SALON_OPERATOR', 'SALON_MANAGER']}>
            <Layout><VolunteerTasks /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute allowedRoles={['EVENT_VOLUNTEER', 'SALON_OPERATOR', 'SALON_MANAGER']}>
            <Layout><UserProfile /></Layout>
          </ProtectedRoute>
        } />

        {/* ברירת מחדל לכל נתיב לא מוכר */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}

export default App;
