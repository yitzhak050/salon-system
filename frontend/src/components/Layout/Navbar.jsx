import React, { useState, useEffect, useContext } from 'react';
import {
  AppBar, Toolbar, Typography, IconButton, Badge, Popover, List,
  ListItem, ListItemText, Box, Button, Tooltip, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import InstallMobileIcon from '@mui/icons-material/InstallMobile';
import { AuthContext } from '../../App';
import { triggerBrowserPopupNotification } from '../../pages/UserProfile';
import * as api from '../../services/api';

const Clock = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const dateStr = now.toLocaleDateString('he-IL', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <Box sx={{ textAlign: 'center', lineHeight: 1.1, display: { xs: 'none', sm: 'block' } }}>
      <Typography
        sx={{
          fontFamily: 'monospace',
          fontSize: '1.1rem',
          fontWeight: 600,
          letterSpacing: 2,
          color: 'inherit',
          lineHeight: 1.2,
        }}
      >
        {timeStr}
      </Typography>
      <Typography
        sx={{
          fontSize: '0.65rem',
          opacity: 0.75,
          letterSpacing: 0.5,
          color: 'inherit',
        }}
      >
        {dateStr}
      </Typography>
    </Box>
  );
};

const isIosDevice = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) && !window.MSStream;
};

const isRunningStandalone = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
};

const Navbar = () => {
  const { user, handleLogout, toggleSidebar } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [iosInstallDialogOpen, setIosInstallDialogOpen] = useState(false);

  // Notification preferences & popup state
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    if (!user?.user_id) return true;
    return localStorage.getItem(`salon_notifications_enabled_${user.user_id}`) !== 'false';
  });
  const [needPermissionBanner, setNeedPermissionBanner] = useState(false);
  const [popupToast, setPopupToast] = useState({ open: false, message: '' });

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    const prefHandler = (e) => {
      setNotificationsEnabled(Boolean(e.detail));
    };
    window.addEventListener('salon-notifications-pref-changed', prefHandler);
    return () => window.removeEventListener('salon-notifications-pref-changed', prefHandler);
  }, []);

  // Load user's notification preference from server and check browser permission
  useEffect(() => {
    if (!user?.user_id) return;
    api.getMyProfile()
      .then((res) => {
        const enabled = res.data?.notifications_enabled !== false;
        setNotificationsEnabled(enabled);
        localStorage.setItem(`salon_notifications_enabled_${user.user_id}`, enabled ? 'true' : 'false');
        if (enabled && typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'default') {
            // Try requesting automatically; if browser requires user gesture, show non-intrusive banner
            Notification.requestPermission().then((perm) => {
              if (perm === 'default') setNeedPermissionBanner(true);
            }).catch(() => {
              setNeedPermissionBanner(true);
            });
          }
        }
      })
      .catch(() => {});
  }, [user?.user_id]);

  const handleRequestBrowserPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      setNeedPermissionBanner(false);
      if (perm === 'granted') {
        await triggerBrowserPopupNotification(
          'סלון קהילתי - התראות הופעלו 📅',
          'מעולה! תקבל התראה קופצת יום לפני משמרת, שעה לפני משמרת ובתחילת חודש חדש.',
          'salon-welcome-notif'
        );
      }
    }
  };

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else if (isIosDevice()) {
      setIosInstallDialogOpen(true);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.getNotifications();
      const list = res.data || [];
      setNotifications(list);

      // Check if notifications are enabled for this user (default: true)
      const isEnabled = localStorage.getItem(`salon_notifications_enabled_${user?.user_id}`) !== 'false';
      if (isEnabled && list.length > 0 && user?.user_id) {
        const storageKey = `salon_popped_notifs_${user.user_id}`;
        let poppedIds = [];
        try {
          poppedIds = JSON.parse(localStorage.getItem(storageKey) || '[]');
        } catch (e) {
          poppedIds = [];
        }
        const poppedSet = new Set(poppedIds);
        const newUnread = list.filter((n) => !n.is_read && !poppedSet.has(n.id));

        if (newUnread.length > 0) {
          // Record IDs immediately so each notification pops up only ONCE (never nagging)
          newUnread.forEach((n) => poppedSet.add(n.id));
          localStorage.setItem(storageKey, JSON.stringify(Array.from(poppedSet).slice(-100)));

          // Show the latest unread notification in an in-app popup toast + native OS/Android popup
          const latest = newUnread[0];
          setPopupToast({ open: true, message: latest.message });
          await triggerBrowserPopupNotification('סלון קהילתי - תזכורת 📅', latest.message, `notif-${latest.id}`);
        }
      }
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    if (notificationsEnabled && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      handleRequestBrowserPermission();
    }
  };
  const handleClose = () => setAnchorEl(null);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllRead();
      fetchNotifications();
    } catch (e) {
      console.error('Failed to mark all as read', e);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const showInstallButton = !isRunningStandalone() && (Boolean(deferredPrompt) || isIosDevice());

  return (
    <>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              color="inherit"
              edge="start"
              onClick={toggleSidebar}
              sx={{ display: { xs: 'inline-flex', md: 'none' }, ml: 0.5 }}
              title="תפריט"
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              סלון קהילתי
            </Typography>
          </Box>

          {/* שעון מרכזי */}
          <Clock />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1.5 } }}>
            {needPermissionBanner && notificationsEnabled && (
              <Button
                color="warning"
                variant="contained"
                size="small"
                startIcon={<NotificationsActiveIcon />}
                onClick={handleRequestBrowserPermission}
                sx={{ fontSize: '0.75rem', py: 0.4, px: 1, fontWeight: 'bold' }}
              >
                אשר התראות
              </Button>
            )}
            {showInstallButton && (
              <Tooltip title="התקן כאפליקציה במכשיר">
                <Button
                  color="inherit"
                  size="small"
                  variant="outlined"
                  startIcon={<InstallMobileIcon />}
                  onClick={handleInstallApp}
                  sx={{
                    borderColor: 'rgba(255,255,255,0.6)',
                    fontSize: '0.78rem',
                    py: 0.4,
                    px: 1,
                  }}
                >
                  התקן אפליקציה
                </Button>
              </Tooltip>
            )}
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              שלום, {user?.name}
            </Typography>
            <IconButton color="inherit" onClick={handleClick}>
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
            <IconButton color="inherit" onClick={handleLogout} title="התנתק">
              <LogoutIcon />
            </IconButton>
          </Box>
        </Toolbar>
        <Popover
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Box sx={{ p: 2, width: 320 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">התראות</Typography>
              <Button size="small" onClick={handleMarkAllRead}>סמן הכל כנקרא</Button>
            </Box>
            <List>
              {notifications.slice(0, 6).map((notif) => (
                <ListItem key={notif.id} sx={{ bgcolor: notif.is_read ? 'transparent' : 'action.hover', borderRadius: 1, mb: 0.5 }}>
                  <ListItemText
                    primary={notif.message}
                    secondary={new Date(notif.created_at).toLocaleString('he-IL')}
                  />
                </ListItem>
              ))}
              {notifications.length === 0 && (
                <ListItem>
                  <ListItemText primary="אין התראות חדשות" />
                </ListItem>
              )}
            </List>
          </Box>
        </Popover>
      </AppBar>

      {/* חלון קופץ (Toast) בעת קבלת התראה חדשה */}
      <Snackbar
        open={popupToast.open}
        autoHideDuration={7000}
        onClose={() => setPopupToast({ ...popupToast, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ mt: 7 }}
      >
        <Alert
          severity="info"
          variant="filled"
          icon={<NotificationsActiveIcon />}
          onClose={() => setPopupToast({ ...popupToast, open: false })}
          sx={{ fontWeight: 'bold', boxShadow: 4 }}
        >
          {popupToast.message}
        </Alert>
      </Snackbar>

      {/* מדריך התקנה קצר לאייפון (Apple iOS) */}
      <Dialog open={iosInstallDialogOpen} onClose={() => setIosInstallDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">התקנת האפליקציה באייפון (Apple)</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            כדי להתקין את <strong>סלון קהילתי</strong> כאפליקציה באייפון ולקבל התראות:
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            1. לחץ על כפתור ה-<strong>שיתוף (Share ⬆️)</strong> בתחתית דפדפן Safari.
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            2. גלול מעט למטה ובחר ב-<strong>"הוסף למסך הבית" (Add to Home Screen ➕)</strong>.
          </Typography>
          <Typography variant="body2">
            3. לחץ על <strong>"הוסף" (Add)</strong> בפינה העליונה.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setIosInstallDialogOpen(false)}>הבנתי</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Navbar;
