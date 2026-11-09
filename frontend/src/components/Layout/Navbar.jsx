import React, { useState, useEffect, useContext } from 'react';
import { AppBar, Toolbar, Typography, IconButton, Badge, Popover, List, ListItem, ListItemText, Box, Button, Tooltip } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import InstallMobileIcon from '@mui/icons-material/InstallMobile';
import { AuthContext } from '../../App';
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

const Navbar = () => {
  const { user, handleLogout, toggleSidebar } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res.data);
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

  const handleClick = (event) => setAnchorEl(event.currentTarget);
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

  return (
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
          {deferredPrompt && (
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
          <IconButton color="inherit" onClick={handleLogout}>
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
        <Box sx={{ p: 2, width: 300 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6">התראות</Typography>
            <Button size="small" onClick={handleMarkAllRead}>סמן הכל כנקרא</Button>
          </Box>
          <List>
            {notifications.slice(0, 5).map((notif) => (
              <ListItem key={notif.id} sx={{ bgcolor: notif.is_read ? 'transparent' : 'action.hover' }}>
                <ListItemText primary={notif.message} secondary={new Date(notif.created_at).toLocaleString('he-IL')} />
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
  );
};

export default Navbar;
