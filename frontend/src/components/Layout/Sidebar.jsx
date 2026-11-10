import React, { useContext } from 'react';
import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, useMediaQuery, useTheme } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import EditNoteIcon from '@mui/icons-material/EditNote';
import CampaignIcon from '@mui/icons-material/Campaign';
import { AuthContext } from '../../App';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 240;

const Sidebar = () => {
  const { user, mobileOpen, setMobileOpen } = useContext(AuthContext);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();

  const adminMenu = [
    { text: 'לוח בקרה', icon: <DashboardIcon />, path: '/admin' },
    { text: 'לוח משמרות', icon: <CalendarMonthIcon />, path: '/admin/shifts' },
    { text: 'דוחות', icon: <AssessmentIcon />, path: '/admin/reports' },
    { text: 'ניהול משימות', icon: <AssignmentIcon />, path: '/admin/tasks' },
    { text: 'ניהול משתמשים', icon: <PeopleIcon />, path: '/admin/users' },
    { text: 'עריכת אתר', icon: <EditNoteIcon />, path: '/admin/site-settings' },
    { text: 'פרופיל אישי', icon: <AccountCircleIcon />, path: '/profile' },
  ];

  const volunteerMenu = [
    { text: 'לוח משמרות אישי', icon: <CalendarMonthIcon />, path: '/volunteer' },
    { text: 'לוח מודעות', icon: <CampaignIcon />, path: '/volunteer/notice-board' },
    { text: 'משימות סגירה', icon: <AssignmentIcon />, path: '/volunteer/tasks' },
    { text: 'פרופיל אישי', icon: <AccountCircleIcon />, path: '/profile' },
  ];

  // Only SALON_MANAGER sees adminMenu; SALON_OPERATOR and EVENT_VOLUNTEER see volunteerMenu
  const menu = user?.role === 'SALON_MANAGER' ? adminMenu : volunteerMenu;

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isMobile ? mobileOpen : true}
      onClose={() => setMobileOpen && setMobileOpen(false)}
      anchor="right"
      ModalProps={{ keepMounted: true }}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { 
          width: drawerWidth, 
          boxSizing: 'border-box',
          right: 0,
          left: 'auto',
          borderLeft: '1px solid rgba(0, 0, 0, 0.12)',
          borderRight: 'none'
        },
      }}
    >
      <Toolbar />
      <List sx={{ pt: 1 }}>
        {menu.map((item) => {
          const isSelected = location.pathname === item.path;
          return (
            <ListItem disablePadding key={item.text} sx={{ mb: 0.5 }}>
              <ListItemButton 
                selected={isSelected}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile && setMobileOpen) {
                    setMobileOpen(false);
                  }
                }}
                sx={{
                  mx: 1,
                  borderRadius: 1.5,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' },
                    '& .MuiListItemIcon-root': { color: 'white' },
                    '& .MuiListItemText-primary': { color: 'white', fontWeight: 'bold' }
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: isSelected ? 'white' : 'primary.main' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  primaryTypographyProps={{ 
                    fontWeight: isSelected ? 'bold' : 500,
                    fontSize: '0.95rem'
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Drawer>
  );
};

export default Sidebar;
