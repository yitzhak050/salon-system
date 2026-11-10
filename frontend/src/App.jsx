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
import AdminSiteCustomization from './pages/AdminSiteCustomization';
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import { getStoredToken, saveAuthToken, clearAuthToken, getPublicSettings } from './services/api';
import {
  Box, Typography, Button, Paper, IconButton, Link, Dialog,
  DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SecurityIcon from '@mui/icons-material/Security';

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
  const [privacyPolicyOpen, setPrivacyPolicyOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    const fetchLogo = () => {
      getPublicSettings()
        .then(res => {
          if (res.data?.logo_url) {
            setLogoUrl(res.data.logo_url);
          } else {
            setLogoUrl('');
          }
        })
        .catch(() => {});
    };

    fetchLogo();
    window.addEventListener('salon-settings-changed', fetchLogo);
    return () => window.removeEventListener('salon-settings-changed', fetchLogo);
  }, []);

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: '#f8fafc',
        flexDirection: 'column',
        position: 'relative',
        '&::before': logoUrl ? {
          content: '""',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url("${logoUrl}")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: '360px',
          opacity: 0.05,
          pointerEvents: 'none',
          zIndex: 0
        } : {}
      }}
    >
      <Box sx={{ display: 'flex', flexGrow: 1, position: 'relative', zIndex: 1 }}>
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
              py: 2,
              mt: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.8,
              borderTop: '1px solid #e2e8f0',
              bgcolor: 'transparent'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                נבנה ליוצאים לשינוי על ידי יצחק גרוס
              </Typography>
              <IconButton
                component="a"
                href="https://wa.me/972502470908?text=%D7%94%D7%92%D7%A2%D7%AA%D7%99%20%D7%9E%D7%94%D7%90%D7%AA%D7%A8%20%D7%A9%D7%97%20%D7%99%D7%95%D7%A6%D7%90%D7%99%D7%9D%20%D7%9C%D7%A9%D7%99%D7%A0%D7%95%D7%99"
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                sx={{
                  color: '#25D366',
                  p: 0.5,
                  '&:hover': { bgcolor: 'rgba(37, 211, 102, 0.1)' }
                }}
                title="פנייה בוואטסאפ ליצחק גרוס"
              >
                <WhatsAppIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Box>

            <Link
              component="button"
              variant="caption"
              onClick={() => setPrivacyPolicyOpen(true)}
              sx={{
                color: 'text.secondary',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '0.75rem',
                '&:hover': { color: 'primary.main' }
              }}
            >
              הצהרת פרטיות
            </Link>
          </Box>
        </Box>
        {user && <Sidebar />}
      </Box>

      {/* Privacy Policy Dialog */}
      <Dialog
        open={privacyPolicyOpen}
        onClose={() => setPrivacyPolicyOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
          <SecurityIcon color="primary" fontSize="small" />
          הצהרת פרטיות
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: '1rem', color: 'text.primary', mt: 1, lineHeight: 1.6 }}>
            כל המידע שנתתם נשמר רק לצורך תפעול האתר.
            <br /><br />
            כל המידע שנשמר שקוף לכם, וניתן למחוק את כל הנתונים בכל עת על ידי בקשה מהאחראי.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPrivacyPolicyOpen(false)} variant="contained" autoFocus>
            הבנתי, סגור
          </Button>
        </DialogActions>
      </Dialog>
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
        <Route path="/admin/site-settings" element={
          <ProtectedRoute allowedRoles={['SALON_MANAGER']}>
            <Layout><AdminSiteCustomization /></Layout>
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
