import React, { useState, useEffect, useContext } from 'react';
import {
  Container, Grid, Typography, Card, CardContent, Dialog,
  DialogTitle, DialogContent, DialogActions, Button, Box,
  Alert, Chip, Slider, TextField, FormControlLabel, Switch,
  Snackbar, Tooltip, IconButton, Stack, Divider, Paper,
  Table, TableBody, TableCell, TableHead, TableRow, CircularProgress,
  MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import EditIcon from '@mui/icons-material/Edit';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CancelIcon from '@mui/icons-material/Cancel';
import MoreTimeIcon from '@mui/icons-material/MoreTime';
import WeekendIcon from '@mui/icons-material/Weekend';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PrintIcon from '@mui/icons-material/Print';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import PeopleIcon from '@mui/icons-material/People';
import ShiftCalendar from '../components/Calendar/ShiftCalendar';
import HoursProgress from '../components/ProgressBar/HoursProgress';
import { formatHebrewDate, shiftSlotLabel } from '../utils/dateUtils';
import * as api from '../services/api';
import { AuthContext } from '../App';

const formatHour = (val) => {
  const h = Math.floor(val);
  const m = Math.round((val - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const VolunteerPortal = () => {
  const { user } = useContext(AuthContext);
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth() + 1);
  const [viewYear, setViewYear] = useState(currentDate.getFullYear());
  const [shifts, setShifts] = useState([]);
  const [stats, setStats] = useState({ total_hours: 0 });
  const [selectedShift, setSelectedShift] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Editable user yearly goal hours (saved in localStorage)
  const [goalHours, setGoalHours] = useState(() => {
    const saved = localStorage.getItem(`volunteer_goal_hours_yearly_${user?.user_id}`);
    return saved ? Number(saved) : 60;
  });
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(goalHours);

  // Attendance Report PDF Modal state
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [attendanceReport, setAttendanceReport] = useState(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Partial hours in regular shift modal
  const [isPartialHours, setIsPartialHours] = useState(false);
  const [partialRange, setPartialRange] = useState([10, 14]);

  // Weekend / custom hours signup dialog
  const [weekendDialogOpen, setWeekendDialogOpen] = useState(false);
  const [customDate, setCustomDate] = useState(() => {
    const d = new Date();
    // Default to upcoming Friday
    const day = d.getDay();
    const diff = (5 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
  });
  const [customRange, setCustomRange] = useState([10, 14]);
  const [customNotes, setCustomNotes] = useState('');

  const [message, setMessage] = useState({ open: false, text: '', type: 'info' });

  const showNotification = (text, type = 'success') => {
    setMessage({ open: true, text, type });
  };

  const fetchVolunteerData = async () => {
    try {
      const [shiftsRes, statsRes] = await Promise.all([
        api.getShifts(viewMonth, viewYear),
        api.getVolunteerStats(viewYear)
      ]);
      setShifts(shiftsRes.data || []);
      setStats(statsRes.data || { total_hours: 0 });
    } catch (e) {
      console.error(e);
      showNotification('שגיאה בטעינת נתונים', 'error');
    }
  };

  useEffect(() => {
    fetchVolunteerData();
  }, [viewMonth, viewYear]);

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setViewMonth(now.getMonth() + 1);
    setViewYear(now.getFullYear());
  };

  const handleSaveGoal = () => {
    const val = Number(tempGoal);
    if (val > 0 && val <= 500) {
      setGoalHours(val);
      localStorage.setItem(`volunteer_goal_hours_yearly_${user?.user_id}`, val);
      setIsEditingGoal(false);
      showNotification(`יעד השעות השנתי עודכן ל-${val} שעות בהצלחה!`);
    } else {
      showNotification('נא להזין מספר שעות תקין (בין 1 ל-500)', 'warning');
    }
  };

  const handleShiftClick = (shift) => {
    setSelectedShift(shift);
    setIsPartialHours(false);
    if (shift.slot === 'MORNING') setPartialRange([10, 14]);
    else if (shift.slot === 'AFTERNOON') setPartialRange([14, 18]);
    else setPartialRange([18, 22]);
    setDialogOpen(true);
  };

  const handleAssign = async () => {
    try {
      const notes = isPartialHours ? `שעות: ${formatHour(partialRange[0])}-${formatHour(partialRange[1])}` : null;
      await api.assignShift(selectedShift.id, null, notes);
      showNotification('שובצת בהצלחה למשמרת!');
      setDialogOpen(false);
      fetchVolunteerData();
    } catch (e) {
      showNotification(e.response?.data?.detail || 'שגיאה בהרשמה למשמרת', 'error');
    }
  };

  const handleUnassign = async () => {
    if (!myAssignment) return;
    if (!window.confirm('האם אתה בטוח שברצונך לבטל את ההרשמה למשמרת זו?')) return;
    try {
      await api.unassignShift(myAssignment.id);
      showNotification('ההרשמה למשמרת בוטלה בהצלחה');
      setDialogOpen(false);
      fetchVolunteerData();
    } catch (e) {
      showNotification(e.response?.data?.detail || 'שגיאה בביטול הרשמה', 'error');
    }
  };

  const handleCustomSignup = async (e) => {
    e.preventDefault();
    try {
      await api.customShiftSignup({
        date: customDate,
        start_time: formatHour(customRange[0]),
        end_time: formatHour(customRange[1]),
        notes: customNotes
      });
      showNotification('שובצת בהצלחה להתנדבות המיוחדת!');
      setWeekendDialogOpen(false);
      setCustomNotes('');
      fetchVolunteerData();
    } catch (e) {
      showNotification(e.response?.data?.detail || 'שגיאה בהרשמה', 'error');
    }
  };

  const handleClockIn = async () => {
    try {
      await api.clockIn(selectedShift.id);
      showNotification('כניסה למשמרת נרשמה בהצלחה!');
      setDialogOpen(false);
      fetchVolunteerData();
    } catch (e) {
      showNotification('שגיאה ברישום כניסה', 'error');
    }
  };

  const handleClockOut = async () => {
    try {
      await api.clockOut(selectedShift.id);
      showNotification('יציאה ממשמרת נרשמה בהצלחה!');
      setDialogOpen(false);
      fetchVolunteerData();
    } catch (e) {
      showNotification('שגיאה ברישום יציאה', 'error');
    }
  };

  const handleQuickClockIn = async (shiftId) => {
    try {
      await api.clockIn(shiftId);
      showNotification('כניסה למשמרת נרשמה בהצלחה!');
      fetchVolunteerData();
    } catch (e) {
      showNotification(e.response?.data?.detail || 'שגיאה ברישום כניסה', 'error');
    }
  };

  const handleQuickClockOut = async (shiftId) => {
    try {
      await api.clockOut(shiftId);
      showNotification('יציאה ממשמרת נרשמה בהצלחה! השעות נוספו למניין השעות.');
      fetchVolunteerData();
    } catch (e) {
      showNotification(e.response?.data?.detail || 'שגיאה ברישום יציאה', 'error');
    }
  };

  const handleOpenAttendanceReport = async () => {
    setAttendanceModalOpen(true);
    setLoadingAttendance(true);
    try {
      const res = await api.getVolunteerAttendanceReport(currentYear);
      setAttendanceReport(res.data);
    } catch (e) {
      console.error(e);
      showNotification('שגיאה בטעינת נתוני דוח נוכחות', 'error');
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handlePrintAttendanceReport = () => {
    window.print();
  };

  const handleDownloadPdfFile = async () => {
    try {
      const res = await api.downloadVolunteerPdf(currentYear);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `volunteer-attendance-${currentYear}.pdf`);
      document.body.appendChild(link);
      link.click();
      showNotification('דוח נוכחות PDF הורד בהצלחה!');
    } catch (e) {
      console.error(e);
      showNotification('שגיאה בהורדת קובץ PDF', 'error');
    }
  };

  // My monthly shifts count and commitments
  const myMonthlyShifts = shifts.filter(s => s.assignments?.some(a => a.user_id === user?.user_id));
  const myShiftsCount = myMonthlyShifts.length;
  const isMinCommitmentMet = myShiftsCount >= 2;

  // Selected shift helpers
  const isAssignedToSelected = selectedShift?.assignments?.some(a => a.user_id === user?.user_id);
  const myAssignment = selectedShift?.assignments?.find(a => a.user_id === user?.user_id);
  const maxVol = selectedShift?.max_volunteers || 1;
  const enrolledCount = selectedShift?.assignments?.length || 0;
  const isShiftFull = enrolledCount >= maxVol;

  // Today's shifts and attendance detection
  const todayDay = currentDate.getDate();
  const todayMonth = currentDate.getMonth() + 1;
  const todayYear = currentDate.getFullYear();
  const todayShifts = shifts.filter(s => {
    const d = new Date(s.date);
    return d.getDate() === todayDay && (d.getMonth() + 1) === todayMonth && d.getFullYear() === todayYear;
  });

  const myTodayShift = todayShifts.find(s => s.assignments?.some(a => a.user_id === user?.user_id));
  const myTodayAssignment = myTodayShift?.assignments?.find(a => a.user_id === user?.user_id);

  // Today's attendees list ("מי היה / נמצא היום בסלון")
  const todayAttendees = [];
  todayShifts.forEach(s => {
    (s.assignments || []).forEach(a => {
      todayAttendees.push({
        ...a,
        shiftSlot: s.slot,
        shiftTitle: s.title
      });
    });
  });

  // Check 24-hour cutoff
  let canCancel = true;
  if (selectedShift) {
    const slotHour = selectedShift.slot === 'MORNING' ? 10 : (selectedShift.slot === 'AFTERNOON' ? 14 : 18);
    const shiftStart = new Date(selectedShift.date);
    shiftStart.setHours(slotHour, 0, 0, 0);
    const diffHours = (shiftStart.getTime() - Date.now()) / (1000 * 3600);
    canCancel = diffHours >= 24;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 3, mb: 4, px: { xs: 1.5, sm: 3 } }}>
      {/* Top Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }} className="no-print">
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            אזור אישי - מתנדב
          </Typography>
          <Typography variant="body2" color="text.secondary">
            שלום {user?.name}, כאן תוכל לנהל את משמרותיך, להירשם לשעות חלקיות וסופ"ש, ולעקוב אחר יעדי ההתנדבות
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          <Button
            variant="contained"
            color="primary"
            startIcon={<PictureAsPdfIcon />}
            onClick={handleOpenAttendanceReport}
            sx={{ borderRadius: 2 }}
          >
            ייצוא דוח נוכחות (PDF)
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<WeekendIcon />}
            onClick={() => {
              setCustomDate(new Date().toISOString().split('T')[0]);
              setCustomRange([22, 24]);
              setWeekendDialogOpen(true);
            }}
            sx={{ borderRadius: 2 }}
          >
            הרשמה חופשית (לילה 22-00 / סופ"ש)
          </Button>
        </Stack>
      </Box>

      {/* Commitment Alert Banner */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: isMinCommitmentMet ? '#e8f5e9' : '#fff8e1', border: `1px solid ${isMinCommitmentMet ? '#a5d6a7' : '#ffe082'}` }} className="no-print">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {isMinCommitmentMet ? <CheckCircleIcon color="success" sx={{ fontSize: 28 }} /> : <WarningAmberIcon color="warning" sx={{ fontSize: 28 }} />}
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" color={isMinCommitmentMet ? 'success.dark' : 'warning.dark'}>
                מעקב משמרות חובה חודשיות: ביצעת {myShiftsCount} מתוך 2 משמרות חובה החודש
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isMinCommitmentMet
                  ? 'כל הכבוד! עמדת ביעד המינימום של 2 משמרות לחודש זה.'
                  : `נותרה לך עוד ${2 - myShiftsCount} משמרת להשלמת מכסת המינימום החודשית (2 משמרות).`}
              </Typography>
            </Box>
          </Box>
          <Chip
            label={isMinCommitmentMet ? 'עמדת ביעד' : `חסרות ${2 - myShiftsCount} משמרות`}
            color={isMinCommitmentMet ? 'success' : 'warning'}
            variant="filled"
          />
        </Box>
      </Paper>

      {/* כרטיס נוכחות מהיר להיום - כפתור גדול של כניסה/יציאה ומי היה בסלון */}
      <Paper
        className="no-print"
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 2.5,
          boxShadow: 2,
          border: '2px solid',
          borderColor: myTodayAssignment?.clock_in && !myTodayAssignment?.clock_out ? '#ef5350' : (myTodayShift ? '#66bb6a' : '#90caf9'),
          bgcolor: myTodayAssignment?.clock_in && !myTodayAssignment?.clock_out ? '#ffebee' : '#f9fbe7'
        }}
      >
        <Grid container spacing={2.5} alignItems="center">
          {/* כפתור גדול של כניסה/יציאה עבור המשתמש */}
          <Grid item xs={12} md={7}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <AccessTimeIcon color={myTodayShift ? "success" : "action"} sx={{ fontSize: 34 }} />
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  {myTodayShift
                    ? `משמרת היום שלך: ${shiftSlotLabel(myTodayShift.slot)}`
                    : 'נוכחות ודיווח כניסה/יציאה להיום'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {myTodayShift
                    ? (myTodayAssignment?.clock_in
                        ? (myTodayAssignment?.clock_out
                            ? `המשמרת הסתיימה בהצלחה (יציאה ב-${new Date(myTodayAssignment.clock_out).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })})`
                            : `נכנסת בשעה ${new Date(myTodayAssignment.clock_in).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })} • משמרת פעילה כעת`)
                        : 'הינך רשום למשמרת היום! לחץ על הכפתור כדי לדווח כניסה:')
                    : 'אין לך משמרת מתוכננת להיום. מעוניין להגיע? לחץ על משמרת פנויה בלוח למטה להרשמה.'}
                </Typography>
              </Box>
            </Box>

            {myTodayShift && (
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                {!myTodayAssignment?.clock_in && (
                  <Button
                    variant="contained"
                    color="success"
                    size="large"
                    startIcon={<LoginIcon sx={{ fontSize: 30 }} />}
                    onClick={() => handleQuickClockIn(myTodayShift.id)}
                    sx={{
                      py: 1.8,
                      px: 4,
                      fontSize: { xs: '1.1rem', sm: '1.25rem' },
                      fontWeight: 'bold',
                      borderRadius: 2.5,
                      boxShadow: '0 4px 14px rgba(46, 125, 50, 0.4)'
                    }}
                  >
                    כניסה למשמרת (Clock In)
                  </Button>
                )}

                {myTodayAssignment?.clock_in && !myTodayAssignment?.clock_out && (
                  <Button
                    variant="contained"
                    color="error"
                    size="large"
                    startIcon={<LogoutIcon sx={{ fontSize: 30 }} />}
                    onClick={() => handleQuickClockOut(myTodayShift.id)}
                    sx={{
                      py: 1.8,
                      px: 4,
                      fontSize: { xs: '1.1rem', sm: '1.25rem' },
                      fontWeight: 'bold',
                      borderRadius: 2.5,
                      boxShadow: '0 4px 14px rgba(211, 47, 47, 0.4)'
                    }}
                  >
                    יציאה ממשמרת (Clock Out)
                  </Button>
                )}

                {myTodayAssignment?.clock_out && (
                  <Chip
                    icon={<CheckCircleIcon />}
                    label="משמרת הושלמה בהצלחה! השעות נרשמו במערכת"
                    color="success"
                    variant="filled"
                    sx={{ py: 2.5, px: 1.5, fontSize: '0.95rem', fontWeight: 'bold', borderRadius: 2 }}
                  />
                )}
              </Box>
            )}
          </Grid>

          {/* מי היה בסלון היום - רישום נוכחות */}
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 1.5, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #dcedc8' }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PeopleIcon fontSize="small" color="primary" />
                מי נמצא / היה היום בסלון ({formatHebrewDate(currentDate)}):
              </Typography>

              {todayAttendees.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  טרם שובצו מתנדבים למשמרות של היום.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {todayAttendees.map((att, idx) => {
                    const isCurrentUser = att.user_id === user?.user_id;
                    let presenceStatus = 'מתוכנן להמשך';
                    let badgeColor = 'default';
                    if (att.clock_out) {
                      presenceStatus = `סיים/ה (${new Date(att.clock_out).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })})`;
                      badgeColor = 'info';
                    } else if (att.clock_in) {
                      presenceStatus = `במשמרת כעת (${new Date(att.clock_in).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })})`;
                      badgeColor = 'success';
                    }

                    return (
                      <Box
                        key={idx}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          p: 0.8,
                          bgcolor: isCurrentUser ? '#e8f5e9' : '#fafafa',
                          borderRadius: 1,
                          border: '1px solid #e0e0e0'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight={isCurrentUser ? "bold" : "normal"}>
                            {att.user_name || (isCurrentUser ? user?.name : 'מתנדב')}
                            {isCurrentUser && ' (אני)'}
                          </Typography>
                          <Chip label={shiftSlotLabel(att.shiftSlot)} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                        </Box>
                        <Chip label={presenceStatus} color={badgeColor} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3} className="no-print">
        {/* השעות שלי שנתי ויעד שעות שנתי */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">השעות שלי השנה ({currentYear})</Typography>
                <Tooltip title="ערוך יעד שעות שנתי">
                  <IconButton size="small" onClick={() => { setTempGoal(goalHours); setIsEditingGoal(true); }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              <HoursProgress totalHours={stats.total_hours || 0} goalHours={goalHours} periodLabel="שנתי" />

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">יעד שעות שנתי:</Typography>
                <Typography variant="body1" fontWeight="bold">{goalHours} שעות</Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                <Typography variant="body2" color="text.secondary">שעות שנותרו ליעד:</Typography>
                <Typography variant="body1" fontWeight="bold" color="primary.main">
                  {Math.max(0, goalHours - (stats.total_hours || 0)).toFixed(1)} שעות
                </Typography>
              </Box>

              <Button
                variant="outlined"
                color="primary"
                fullWidth
                startIcon={<PictureAsPdfIcon />}
                onClick={handleOpenAttendanceReport}
                sx={{ mt: 2.5, borderRadius: 2, fontWeight: 'bold' }}
              >
                הפקת דוח נוכחות (PDF)
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* לוח משמרות */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Box>
                  <Typography variant="h6" fontWeight="bold">לוח משמרות</Typography>
                  <Typography variant="caption" color="text.secondary">
                    לחץ על משמרת כדי להירשם או לדווח שעות
                  </Typography>
                </Box>

                {/* חודש ודפדוף */}
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Tooltip title="חודש קודם">
                    <IconButton size="small" onClick={handlePrevMonth} color="primary">
                      <ChevronRightIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="חזרה לחודש הנוכחי">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<TodayIcon fontSize="small" />}
                      onClick={handleCurrentMonth}
                      sx={{ px: 1, py: 0.2, minWidth: 0, fontSize: '0.8rem' }}
                    >
                      היום
                    </Button>
                  </Tooltip>
                  <Tooltip title="חודש הבא">
                    <IconButton size="small" onClick={handleNextMonth} color="primary">
                      <ChevronLeftIcon />
                    </IconButton>
                  </Tooltip>

                  <FormControl size="small" sx={{ minWidth: 80, ml: 1 }}>
                    <Select
                      value={viewMonth}
                      onChange={(e) => setViewMonth(Number(e.target.value))}
                      sx={{ height: 32, fontSize: '0.85rem' }}
                    >
                      {['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'].map((mName, i) => (
                        <MenuItem key={i + 1} value={i + 1}>{mName}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 80 }}>
                    <Select
                      value={viewYear}
                      onChange={(e) => setViewYear(Number(e.target.value))}
                      sx={{ height: 32, fontSize: '0.85rem' }}
                    >
                      {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(y => (
                        <MenuItem key={y} value={y}>{y}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              </Box>

              <ShiftCalendar
                shifts={shifts}
                month={viewMonth}
                year={viewYear}
                viewMode="volunteer"
                onShiftClick={handleShiftClick}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* דיאלוג עריכת יעד שעות אישי */}
      <Dialog open={isEditingGoal} onClose={() => setIsEditingGoal(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">עריכת יעד שעות שנתי</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            קבע כמה שעות התנדבות תרצה להציב כיעד שנתי לשנת {currentYear} (ברירת המחדל היא 60 שעות):
          </Typography>
          <TextField
            label={`יעד שעות לשנת ${currentYear}`}
            type="number"
            fullWidth
            value={tempGoal}
            onChange={(e) => setTempGoal(e.target.value)}
            inputProps={{ min: 1, max: 500 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsEditingGoal(false)}>ביטול</Button>
          <Button variant="contained" onClick={handleSaveGoal}>שמור יעד שנתי</Button>
        </DialogActions>
      </Dialog>

      {/* דיאלוג הרשמה לשעות מיוחדות / לילה 22:00-00:00 / סופ"ש */}
      <Dialog open={weekendDialogOpen} onClose={() => setWeekendDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleCustomSignup}>
          <DialogTitle fontWeight="bold">הרשמה להתנדבות חופשית (לילה 22-00 / סופ"ש)</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              כאן ניתן להירשם להתנדבות גם כשאין משמרת רגילה מוגדרת – למשל שעות הלילה 22:00-00:00, סופי שבוע או הגעה מיוחדת:
            </Typography>

            <TextField
              label="תאריך התנדבות"
              type="date"
              fullWidth
              required
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 3, mt: 1 }}
            />

            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              בחירת טווח שעות: {formatHour(customRange[0])} - {formatHour(customRange[1])}
            </Typography>
            <Box sx={{ px: 2, mb: 2 }}>
              <Slider
                value={customRange}
                onChange={(e, val) => setCustomRange(val)}
                min={0}
                max={24}
                step={0.5}
                valueLabelDisplay="auto"
                valueLabelFormat={formatHour}
                marks={[
                  { value: 0, label: '00:00' },
                  { value: 6, label: '06:00' },
                  { value: 12, label: '12:00' },
                  { value: 18, label: '18:00' },
                  { value: 22, label: '22:00' },
                  { value: 24, label: '00:00' },
                ]}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                onClick={() => setCustomRange([22, 24])}
              >
                קבע לילה (22:00 - 00:00)
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setCustomRange([10, 14])}
              >
                קבע בוקר (10:00 - 14:00)
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setCustomRange([18, 22])}
              >
                קבע ערב (18:00 - 22:00)
              </Button>
            </Box>

            <TextField
              label="הערות או תיאור הפעילות (אופציונלי)"
              multiline
              rows={2}
              fullWidth
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="למשל: סגירת לילה 22:00-00:00, ארגון הסלון..."
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setWeekendDialogOpen(false)}>ביטול</Button>
            <Button type="submit" variant="contained" color="secondary">
              אשר הרשמה
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* דיאלוג פרטי משמרת רגילה */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        {selectedShift && (
          <>
            <DialogTitle fontWeight="bold" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>פרטי משמרת - {formatHebrewDate(selectedShift.date)}</span>
              {selectedShift.title && (
                <Chip label={selectedShift.title} color="info" size="small" />
              )}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ my: 1 }}>
                <Typography variant="body1" sx={{ mb: 0.5 }}>
                  שעות: <strong>{shiftSlotLabel(selectedShift.slot)}</strong>
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  תפוסה: <strong>{enrolledCount} מתוך {maxVol} אחראים</strong>
                  {enrolledCount > 0 && (
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                      רשומים: {selectedShift.assignments?.map(a => a.user_name || 'מתנדב').join(', ')}
                    </Typography>
                  )}
                </Typography>

                {/* Capacity warning if full and not registered */}
                {!isAssignedToSelected && isShiftFull && (
                  <Alert severity="warning" sx={{ my: 1.5 }}>
                    המשמרת כבר מלאה (אחראי כבר שובץ למשמרת זו). לא ניתן להירשם אלא אם מנהל יגדיל את המכסה.
                  </Alert>
                )}

                {/* Partial hours slider option for regular shift */}
                {!isAssignedToSelected && !isShiftFull && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={isPartialHours}
                          onChange={(e) => setIsPartialHours(e.target.checked)}
                          color="primary"
                        />
                      }
                      label="אני מעוניין להירשם לשעות חלקיות במשמרת זו (סליידר שעות)"
                    />

                    {isPartialHours && (
                      <Box sx={{ mt: 2, px: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          בחר טווח שעות: {formatHour(partialRange[0])} - {formatHour(partialRange[1])}
                        </Typography>
                        <Slider
                          value={partialRange}
                          onChange={(e, val) => setPartialRange(val)}
                          min={selectedShift.slot === 'MORNING' ? 8 : (selectedShift.slot === 'AFTERNOON' ? 13 : 17)}
                          max={selectedShift.slot === 'MORNING' ? 15 : (selectedShift.slot === 'AFTERNOON' ? 19 : 23)}
                          step={0.5}
                          valueLabelDisplay="auto"
                          valueLabelFormat={formatHour}
                        />
                      </Box>
                    )}
                  </Box>
                )}

                {/* 24-hour cutoff warning if assigned */}
                {isAssignedToSelected && (
                  <Box sx={{ mt: 2 }}>
                    <Alert severity={canCancel ? 'info' : 'warning'}>
                      {canCancel
                        ? 'באפשרותך לבטל את הרשמתך למשמרת זו עד 24 שעות לפני תחילתה.'
                        : 'שים לב: נותרו פחות מ-24 שעות לפני תחילת המשמרת, לא ניתן לבטל את הרישום עצמאית.'}
                    </Alert>
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
              <Box>
                {isAssignedToSelected && (
                  <Tooltip title={!canCancel ? 'לא ניתן לבטל פחות מ-24 שעות לפני המשמרת' : ''}>
                    <span>
                      <Button
                        color="error"
                        variant="outlined"
                        onClick={handleUnassign}
                        disabled={!canCancel}
                        startIcon={<CancelIcon />}
                      >
                        בטל הרשמה
                      </Button>
                    </span>
                  </Tooltip>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button onClick={() => setDialogOpen(false)}>סגור</Button>
                {!isAssignedToSelected ? (
                  <Button
                    variant="contained"
                    onClick={handleAssign}
                    disabled={isShiftFull}
                  >
                    {isPartialHours ? 'הירשם לשעות שנבחרו' : 'הירשם למשמרת'}
                  </Button>
                ) : (
                  <>
                    {!myAssignment?.clock_in && (
                      <Button variant="contained" color="success" onClick={handleClockIn}>כניסה למשמרת</Button>
                    )}
                    {myAssignment?.clock_in && !myAssignment?.clock_out && (
                      <Button variant="contained" color="error" onClick={handleClockOut}>יציאה ממשמרת</Button>
                    )}
                    {myAssignment?.clock_out && (
                      <Chip label="המשמרת הסתיימה" color="success" />
                    )}
                  </>
                )}
              </Box>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* דיאלוג דוח נוכחות אישי וייצוא PDF */}
      <Dialog
        open={attendanceModalOpen}
        onClose={() => setAttendanceModalOpen(false)}
        maxWidth="md"
        fullWidth
        sx={{
          '@media print': {
            '& .MuiDialog-paper': {
              boxShadow: 'none',
              m: 0,
              maxWidth: '100%',
              width: '100%'
            }
          }
        }}
      >
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-attendance-report, #printable-attendance-report * {
              visibility: visible;
            }
            #printable-attendance-report {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 20px;
              background: white;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }} className="no-print">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PictureAsPdfIcon color="error" />
            <Typography variant="h6" fontWeight="bold">דוח נוכחות והתנדבות שנתי ({currentYear})</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PrintIcon />}
              onClick={handlePrintAttendanceReport}
            >
              הדפס / שמור כ-PDF
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={handleDownloadPdfFile}
            >
              הורד PDF
            </Button>
            <Button onClick={() => setAttendanceModalOpen(false)}>סגור</Button>
          </Stack>
        </DialogTitle>

        <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
          {loadingAttendance ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box id="printable-attendance-report" sx={{ p: { xs: 1, sm: 2 } }}>
              {/* Header */}
              <Box sx={{ textAlign: 'center', pb: 2, mb: 3, borderBottom: '2.5px solid #1976D2' }}>
                <Typography variant="h5" fontWeight="bold" color="primary.main">
                  סלון קהילתי - דוח נוכחות ופעילות רשמי
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  תקופת הדוח: שנת {currentYear} | תאריך הפקה: {new Date().toLocaleDateString('he-IL')}
                </Typography>
              </Box>

              {/* Summary Cards */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                    <Typography variant="body1"><strong>שם המתנדב/ת:</strong> {user?.name}</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5 }}><strong>טלפון:</strong> {user?.phone || '—'}</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5 }}><strong>תפקיד:</strong> מתנדב / אחראי משמרת</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2, bgcolor: '#e8f5e9', borderRadius: 2, border: '1px solid #c8e6c9' }}>
                    <Typography variant="body1" color="success.dark">
                      <strong>סה"כ שעות שבוצעו בפועל:</strong> {attendanceReport?.total_hours || stats.total_hours || 0} שעות
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                      <strong>סה"כ משמרות שהושלמו:</strong> {attendanceReport?.shift_count || 0} משמרות
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                      <strong>יעד שעות שנתי:</strong> {goalHours} שעות ({Math.min(100, Math.round(((attendanceReport?.total_hours || stats.total_hours || 0) / goalHours) * 100))}% עמידה ביעד)
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Table */}
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5 }}>
                פירוט כל המשמרות והשעות שבוצעו לשנת {currentYear}:
              </Typography>

              <Table size="small" sx={{ border: '1px solid #e0e0e0', mb: 3 }}>
                <TableHead sx={{ bgcolor: '#f0f4f8' }}>
                  <TableRow>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>תאריך</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>יום</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>משמרת / שעות</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>כניסה בפועל</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>יציאה בפועל</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>שעות שבוצעו</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>סטטוס נוכחות</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>הערות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(!attendanceReport?.records || attendanceReport.records.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        אין עדיין רשומות נוכחות לשנת {currentYear}
                      </TableCell>
                    </TableRow>
                  ) : (
                    attendanceReport.records.map((rec) => (
                      <TableRow key={rec.assignment_id} hover>
                        <TableCell align="right">{rec.date}</TableCell>
                        <TableCell align="right">{rec.day_of_week}</TableCell>
                        <TableCell align="right">{rec.slot} ({rec.hours_range})</TableCell>
                        <TableCell align="right">{rec.clock_in || '—'}</TableCell>
                        <TableCell align="right">{rec.clock_out || '—'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', color: rec.hours_logged > 0 ? 'success.dark' : 'text.secondary' }}>
                          {rec.hours_logged > 0 ? `${rec.hours_logged} שעות` : '0 שעות'}
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={rec.status}
                            size="small"
                            color={rec.status.includes('הושלמה') ? 'success' : (rec.status.includes('אושר') ? 'primary' : 'default')}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">{rec.notes || '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Signatures */}
              <Box sx={{ mt: 5, pt: 3, borderTop: '1px dashed #bdbdbd', display: 'flex', justifyContent: 'space-between', px: 4 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2">חתימת המתנדב/ת:</Typography>
                  <Box sx={{ mt: 4, width: 160, borderBottom: '1px solid #000' }} />
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2">חתימת ואישור מנהל/ת הסלון:</Typography>
                  <Box sx={{ mt: 4, width: 160, borderBottom: '1px solid #000' }} />
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Snackbar
        open={message.open}
        autoHideDuration={4000}
        onClose={() => setMessage({ ...message, open: false })}
      >
        <Alert severity={message.type} onClose={() => setMessage({ ...message, open: false })}>
          {message.text}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default VolunteerPortal;
