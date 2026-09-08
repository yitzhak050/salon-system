import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableHead, TableRow, Button,
  MenuItem, Select, FormControl, InputLabel, Alert, Chip, Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ShiftCalendar from '../components/Calendar/ShiftCalendar';
import { formatHebrewDate, shiftSlotLabel } from '../utils/dateUtils';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import * as api from '../services/api';

const AdminDashboard = () => {
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [shifts, setShifts] = useState([]);
  const [stats, setStats] = useState([]);
  const [usersCount, setUsersCount] = useState(0);
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    try {
      const [shiftsRes, statsRes, usersRes] = await Promise.all([
        api.getShifts(month, year),
        api.getAdminStats(month, year),
        api.getUsers()
      ]);
      setShifts(shiftsRes.data || []);
      setStats(statsRes.data?.volunteer_stats || []);
      setUsersCount(usersRes.data?.length || 0);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [month, year]);

  const handleGenerateShifts = async () => {
    try {
      await api.generateShifts(month, year);
      fetchDashboardData();
    } catch (e) {
      console.error(e);
    }
  };

  const emptyShifts = shifts.filter(s => !s.assignments || s.assignments.length === 0);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            לוח בקרה וניהול
          </Typography>
          <Typography variant="body1" color="text.secondary">
            שלום, היום {formatHebrewDate(currentDate)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 90 }}>
            <InputLabel>חודש</InputLabel>
            <Select value={month} label="חודש" onChange={(e) => setMonth(e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <MenuItem key={m} value={m}>{m}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 90 }}>
            <InputLabel>שנה</InputLabel>
            <Select value={year} label="שנה" onChange={(e) => setYear(e.target.value)}>
              {[currentDate.getFullYear(), currentDate.getFullYear() + 1].map(y => (
                <MenuItem key={y} value={y}>{y}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Quick Navigation Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              cursor: 'pointer',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'scale(1.02)', boxShadow: 4 },
              borderRadius: 2
            }}
            onClick={() => navigate('/admin/shifts')}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <CalendarMonthIcon color="primary" sx={{ fontSize: 36 }} />
                <ArrowForwardIcon color="action" fontSize="small" />
              </Box>
              <Typography variant="h6" fontWeight="bold" sx={{ mt: 1 }}>לוח משמרות</Typography>
              <Typography variant="body2" color="text.secondary">
                {shifts.length} משמרות בחודש
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              cursor: 'pointer',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'scale(1.02)', boxShadow: 4 },
              borderRadius: 2
            }}
            onClick={() => navigate('/admin/users')}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <PeopleIcon color="secondary" sx={{ fontSize: 36 }} />
                <ArrowForwardIcon color="action" fontSize="small" />
              </Box>
              <Typography variant="h6" fontWeight="bold" sx={{ mt: 1 }}>ניהול משתמשים</Typography>
              <Typography variant="body2" color="text.secondary">
                {usersCount} משתמשים במערכת
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              cursor: 'pointer',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'scale(1.02)', boxShadow: 4 },
              borderRadius: 2
            }}
            onClick={() => navigate('/admin/tasks')}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <AssignmentIcon color="warning" sx={{ fontSize: 36 }} />
                <ArrowForwardIcon color="action" fontSize="small" />
              </Box>
              <Typography variant="h6" fontWeight="bold" sx={{ mt: 1 }}>ניהול משימות</Typography>
              <Typography variant="body2" color="text.secondary">
                משימות סגירה ונהלים
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              cursor: 'pointer',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'scale(1.02)', boxShadow: 4 },
              borderRadius: 2
            }}
            onClick={() => navigate('/admin/reports')}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <AssessmentIcon color="success" sx={{ fontSize: 36 }} />
                <ArrowForwardIcon color="action" fontSize="small" />
              </Box>
              <Typography variant="h6" fontWeight="bold" sx={{ mt: 1 }}>דוחות והתנדבות</Typography>
              <Typography variant="body2" color="text.secondary">
                מעקב שעות ויעדים
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alert for empty shifts (holes) */}
      {emptyShifts.length > 0 ? (
        <Alert
          severity="error"
          icon={<WarningAmberIcon fontSize="inherit" />}
          action={
            <Button color="inherit" size="small" onClick={() => navigate('/admin/shifts')}>
              פתח לוח משמרות לשיבוץ
            </Button>
          }
          sx={{ mb: 3 }}
        >
          זוהו <strong>{emptyShifts.length}</strong> חורים במשמרות החודש (משמרות ריקות ללא מתנדבים רשומים).
        </Alert>
      ) : (
        <Alert severity="success" sx={{ mb: 3 }}>
          כל המשמרות החודש מאוכלסות במתנדבים! אין חורים במשמרות.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Month actions */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                פתיחת משמרות לחודש
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                יצירת סבב משמרות אוטומטי (בוקר, צהריים, ערב) עבור חודש {month}/{year} (ללא סופי שבוע)
              </Typography>
              <Button
                variant="contained"
                fullWidth
                onClick={handleGenerateShifts}
                startIcon={<CalendarMonthIcon />}
              >
                ייצור משמרות לחודש
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Volunteer statistics */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  מובילי שעות התנדבות
                </Typography>
                <Button size="small" onClick={() => navigate('/admin/reports')}>
                  לכל הדוחות
                </Button>
              </Box>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'grey.50' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>שם מתנדב</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>שעות</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>משמרות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.slice(0, 5).map((row) => (
                    <TableRow key={row.user_id}>
                      <TableCell>{row.user_name}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{row.total_hours}</TableCell>
                      <TableCell>{row.shift_count}</TableCell>
                    </TableRow>
                  ))}
                  {stats.length === 0 && (
                    <TableRow><TableCell colSpan={3} align="center">אין עדיין נתוני שעות לחודש זה</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>

        {/* Monthly Calendar Preview */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  תצוגת לוח חודשי
                </Typography>
                <Button variant="outlined" size="small" onClick={() => navigate('/admin/shifts')}>
                  ניהול משמרות מלא
                </Button>
              </Box>
              <ShiftCalendar
                shifts={shifts}
                month={month}
                year={year}
                viewMode="admin"
                onShiftClick={() => navigate('/admin/shifts')}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AdminDashboard;
