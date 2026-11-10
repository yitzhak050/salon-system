import React, { createContext, useState, useContext, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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
import NoticeBoardPage from './pages/NoticeBoardPage';
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import { getStoredToken, saveAuthToken, clearAuthToken, getPublicSettings, sanitizeLogoUrl } from './services/api';
import {
  Box, Typography, Button, Paper, IconButton, Link, Dialog,
  DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import SecurityIcon from '@mui/icons-material/Security';

export const AuthContext = createContext(null);

const WHATSAPP_URL = 'https://wa.me/972502470908?text=' + encodeURIComponent('הגעתי מהאתר של יוצאים לשינוי');
const LINKEDIN_URL = 'https://www.linkedin.com/in/050yitzhak';

const ALLOWED_ROLES = ['SALON_MANAGER', 'SALON_OPERATOR', 'EVENT_VOLUNTEER'];

function decodeUserFromToken(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      clearAuthToken();
      return null;
    }
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    if (!payload.exp || payload.exp * 1000 < Date.now()) {
      clearAuthToken();
      return null;
    }
    if (!payload.sub || !ALLOWED_ROLES.includes(payload.role)) {
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
  const { user, setUser } = useContext(AuthContext);
  // Always verify live token from storage on every render/navigation to block back-button after logout
  const liveUser = decodeUserFromToken(getStoredToken());

  useEffect(() => {
    if (!liveUser && user) {
      setUser(null);
    }
  }, [liveUser, user, setUser]);

  if (!liveUser || !user) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(liveUser.role)) {
    return <Navigate to={liveUser.role === 'SALON_MANAGER' ? '/admin' : '/volunteer'} replace />;
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
            setLogoUrl(sanitizeLogoUrl(res.data.logo_url));
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
              gap: 0.5,
              borderTop: '1px solid #e2e8f0',
              bgcolor: 'transparent'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                נבנה ליוצאים לשינוי על ידי{' '}
                <a
                  href="mailto:Yitzchak.gross@gmail.com"
                  style={{ color: '#1976d2', textDecoration: 'none', fontWeight: 600 }}
                >
                  יצחק גרוס
                </a>
              </Typography>
              <IconButton
                component="a"
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                sx={{ color: '#25D366', p: 0.3 }}
                aria-label="וואטסאפ"
              >
                <WhatsAppIcon sx={{ fontSize: 19 }} />
              </IconButton>
              <IconButton
                component="a"
                href={LINKEDIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                sx={{ color: '#0A66C2', p: 0.3 }}
                aria-label="לינקדאין"
              >
                <LinkedInIcon sx={{ fontSize: 19 }} />
              </IconButton>
            </Box>

            <Link
              component="button"
              type="button"
              variant="caption"
              onClick={() => setPrivacyPolicyOpen(true)}
              sx={{
                color: 'text.secondary',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '0.72rem',
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
  // Initialize synchronously from sessionStorage, or (if Remember Me for 30 days was checked) localStorage/cookie
  const [user, setUser] = useState(() => decodeUserFromToken(getStoredToken()));
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleSidebar = () => {
    setMobileOpen(prev => !prev);
  };

  // Guard against URL injection in query string or hash, and enforce session state on history navigation
  useEffect(() => {
    const rawUrl = `${location.pathname}${location.search}${location.hash}`;
    const decodedUrl = (() => {
      try {
        return decodeURIComponent(rawUrl);
      } catch {
        return rawUrl;
      }
    })();

    // Detect XSS / Script / SQL / Path-traversal injection payloads in URL
    const suspiciousUrlPattern = /(<script|javascript:|vbscript:|data:text\/html|onerror=|onload=|\.\.\/|%00)/i;
    if (suspiciousUrlPattern.test(decodedUrl)) {
      const currentLiveUser = decodeUserFromToken(getStoredToken());
      navigate(currentLiveUser ? '/' : '/login', { replace: true });
      return;
    }

    // Re-validate stored token on every route change (prevents back-button navigation after logout)
    const liveUser = decodeUserFromToken(getStoredToken());
    if (!liveUser && user) {
      setUser(null);
      if (location.pathname !== '/login') {
        navigate('/login', { replace: true });
      }
    } else if (liveUser && !user) {
      setUser(liveUser);
    }
  }, [location.pathname, location.search, location.hash, user, navigate]);

  // Block Browser Back/Forward Cache (BFCache), popstate history navigation after logout, and sync across tabs
  useEffect(() => {
    const verifyAuthOnRestore = () => {
      const liveUser = decodeUserFromToken(getStoredToken());
      if (!liveUser) {
        setUser(null);
        if (window.location.pathname !== '/login') {
          window.history.replaceState(null, '', '/login');
          navigate('/login', { replace: true });
        }
      } else {
        setUser(liveUser);
      }
    };

    const handlePageShow = (event) => {
      if (event.persisted) {
        verifyAuthOnRestore();
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('popstate', verifyAuthOnRestore);
    window.addEventListener('storage', verifyAuthOnRestore);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('popstate', verifyAuthOnRestore);
      window.removeEventListener('storage', verifyAuthOnRestore);
    };
  }, [navigate]);

  const handleLogin = (token, rememberForMonth = true) => {
    saveAuthToken(token, rememberForMonth);
    const decoded = decodeUserFromToken(token);
    setUser(decoded);
    const targetPath = decoded?.role === 'SALON_MANAGER' ? '/admin' : '/volunteer';
    navigate(targetPath, { replace: true });
  };

  const handleLogout = () => {
    clearAuthToken();
    setUser(null);
    if (typeof navigator !== 'undefined' && navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_AUTH_CACHE' });
    }
    // Overwrite history entry so clicking Back cannot return to the previous protected screen
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/login');
    }
    navigate('/login', { replace: true });
  };

  return (
    <AuthContext.Provider value={{ user, setUser, handleLogin, handleLogout, mobileOpen, setMobileOpen, toggleSidebar }}>
      <Routes>
        <Route path="/login" element={
          user ? (
            <Navigate to={user.role === 'SALON_MANAGER' ? '/admin' : '/volunteer'} replace />
          ) : (
            <Login onLogin={handleLogin} />
          )
        } />
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
        <Route path="/volunteer/notice-board" element={
          <ProtectedRoute allowedRoles={['EVENT_VOLUNTEER', 'SALON_OPERATOR', 'SALON_MANAGER']}>
            <Layout><NoticeBoardPage /></Layout>
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
