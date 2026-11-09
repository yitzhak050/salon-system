import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableHead, TableRow, Button,
  MenuItem, Select, FormControl, InputLabel, LinearProgress,
  Chip, Divider, Stack, ToggleButton, ToggleButtonGroup, Alert
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PrintIcon from '@mui/icons-material/Print';
import FilterListIcon from '@mui/icons-material/FilterList';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GroupsIcon from '@mui/icons-material/Groups';
import { downloadAdminMonthlyReportPdf } from '../utils/pdfGenerator';
import * as api from '../services/api';

const ReportsPage = () => {
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [selectedVolunteer, setSelectedVolunteer] = useState('ALL');
  const [activityFilter, setActivityFilter] = useState('ALL'); // ALL, ZERO, UNDER_MIN, ACTIVE
  const [goalHours, setGoalHours] = useState(60);

  const [stats, setStats] = useState([]);
  const [users, setUsers] = useState([]);
  const [shiftsGaps, setShiftsGaps] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.getAdminStats(month, year),
        api.getUsers()
      ]);
      setStats(statsRes.data?.volunteer_stats || []);
      setShiftsGaps(statsRes.data?.shifts_with_gap || []);
      setUsers(usersRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [month, year]);

  const handleDownloadBackendPdf = () => {
    try {
      downloadAdminMonthlyReportPdf({
        month,
        year,
        stats: filteredStats,
        goalHours,
        shiftsGaps
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  // Filter by selected volunteer first
  let filteredStats = selectedVolunteer === 'ALL'
    ? stats
    : stats.filter(s => String(s.user_id) === String(selectedVolunteer));

  // Then apply activity filter
  if (activityFilter === 'ZERO') {
    filteredStats = filteredStats.filter(s => (s.shift_count || 0) === 0);
  } else if (activityFilter === 'UNDER_MIN') {
    filteredStats = filteredStats.filter(s => (s.shift_count || 0) < 2);
  } else if (activityFilter === 'ACTIVE') {
    filteredStats = filteredStats.filter(s => (s.shift_count || 0) >= 2);
  }

  const zeroShiftCount = stats.filter(s => (s.shift_count || 0) === 0).length;
  const underMinCount = stats.filter(s => (s.shift_count || 0) < 2).length;
  const activeCount = stats.filter(s => (s.shift_count || 0) >= 2).length;

  const totalVolunteers = filteredStats.length;
  const totalHoursLogged = filteredStats.reduce((acc, curr) => acc + (curr.total_hours || 0), 0);
  const totalShiftsCount = filteredStats.reduce((acc, curr) => acc + (curr.shift_count || 0), 0);

  return (
    <Container maxWidth="lg" sx={{ mt: 3, mb: 4, px: { xs: 1.5, sm: 3 } }} className="reports-container">
      {/* Header for print view */}
      <Box className="print-only" sx={{ display: 'none', mb: 3, textAlign: 'center', borderBottom: '2px solid #1976D2', pb: 2 }}>
        <Typography variant="h4" fontWeight="bold">דוח סיכום פעילות והתנדבות - סלון קהילתי</Typography>
        <Typography variant="subtitle1" color="text.secondary">
          תקופת הדוח: {month}/{year} | תאריך הפקה: {new Date().toLocaleDateString('he-IL')}
        </Typography>
      </Box>

      {/* Screen action header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }} className="no-print">
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            דוחות מערכת והתנדבות
          </Typography>
          <Typography variant="body2" color="text.secondary">
            חיתוך שעות, מעקב עמידה ביעד ומשמרות חובה (2 משמרות), וזיהוי מתנדבים שלא לקחו משמרות כלל
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          <Button
            variant="contained"
            color="primary"
            startIcon={<PrintIcon />}
            onClick={handlePrintPdf}
          >
            הדפס / שמור כ-PDF
          </Button>
          <Button
            variant="outlined"
            startIcon={<PictureAsPdfIcon />}
            onClick={handleDownloadBackendPdf}
          >
            הורד PDF מהשרת
          </Button>
        </Stack>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2, boxShadow: 1 }} className="no-print">
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterListIcon color="primary" /> סינון וחיתוך נתונים
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>חודש</InputLabel>
              <Select value={month} label="חודש" onChange={(e) => setMonth(e.target.value)}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <MenuItem key={m} value={m}>{m}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>שנה</InputLabel>
              <Select value={year} label="שנה" onChange={(e) => setYear(e.target.value)}>
                {Array.from({ length: 11 }, (_, i) => currentDate.getFullYear() - 2 + i).map(y => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>חתך מתנדב</InputLabel>
              <Select
                value={selectedVolunteer}
                label="חתך מתנדב"
                onChange={(e) => setSelectedVolunteer(e.target.value)}
              >
                <MenuItem value="ALL">כל המתנדבים ({stats.length})</MenuItem>
                {users.map(u => (
                  <MenuItem key={u.id} value={u.id}>{u.name} ({u.phone})</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>יעד שעות לחודש</InputLabel>
              <Select
                value={goalHours}
                label="יעד שעות לחודש"
                onChange={(e) => setGoalHours(e.target.value)}
              >
                <MenuItem value={30}>30 שעות</MenuItem>
                <MenuItem value={40}>40 שעות</MenuItem>
                <MenuItem value={60}>60 שעות (ברירת מחדל)</MenuItem>
                <MenuItem value={80}>80 שעות</MenuItem>
                <MenuItem value={100}>100 שעות</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Quick Activity Filter Toggle */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
          <Typography variant="body2" fontWeight="bold" color="text.secondary">
            סינון מהיר לפי פעילות החודש:
          </Typography>
          <ToggleButtonGroup
            value={activityFilter}
            exclusive
            onChange={(e, val) => val && setActivityFilter(val)}
            size="small"
          >
            <ToggleButton value="ALL">
              כל המתנדבים ({stats.length})
            </ToggleButton>
            <ToggleButton value="ZERO" sx={{ color: 'error.main', '&.Mui-selected': { bgcolor: '#ffebee', color: 'error.dark', fontWeight: 'bold' } }}>
              ללא משמרות כלל (0) ({zeroShiftCount})
            </ToggleButton>
            <ToggleButton value="UNDER_MIN" sx={{ color: 'warning.main', '&.Mui-selected': { bgcolor: '#fff8e1', color: 'warning.dark', fontWeight: 'bold' } }}>
              מתחת למינימום 2 ({underMinCount})
            </ToggleButton>
            <ToggleButton value="ACTIVE" sx={{ color: 'success.main', '&.Mui-selected': { bgcolor: '#e8f5e9', color: 'success.dark', fontWeight: 'bold' } }}>
              פעילים (2 ומעלה) ({activeCount})
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 3, borderRadius: 1 }} />}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'primary.50', borderRadius: 2, border: '1px solid #c5cae9' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <AccessTimeIcon color="primary" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4" fontWeight="bold" color="primary.main">
                  {totalHoursLogged.toFixed(1)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  סה"כ שעות שבוצעו
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'secondary.50', borderRadius: 2, border: '1px solid #f8bbd0' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <AssessmentIcon color="secondary" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4" fontWeight="bold" color="secondary.main">
                  {totalShiftsCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  סה"כ משמרות שאוכלסו
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'grey.50', borderRadius: 2, border: '1px solid #e0e0e0' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <GroupsIcon color="action" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {totalVolunteers}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  מתנדבים בחתך המוצג
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Inactivity Alert if there are 0-shift volunteers */}
      {zeroShiftCount > 0 && activityFilter !== 'ZERO' && (
        <Alert severity="warning" sx={{ mb: 3 }} className="no-print">
          שים לב: <strong>{zeroShiftCount}</strong> מתנדבים לא לקחו אף משמרת החודש (0 משמרות). ניתן ללחוץ על הסינון למעלה "ללא משמרות כלל" כדי לראות את הרשימה הממוקדת שלהם.
        </Alert>
      )}

      {/* Details Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 2, boxShadow: 2, mb: 4 }}>
        <Box sx={{ p: 2, bgcolor: 'grey.100', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h6" fontWeight="bold">
            פירוט התנדבות, משמרות ועמידה ביעד - {month}/{year}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            יעד חודשי: {goalHours} שעות | מינימום משמרות: 2
          </Typography>
        </Box>
        <Table sx={{ minWidth: 600 }}>
          <TableHead sx={{ bgcolor: 'grey.50' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>שם המתנדב</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>משמרות החודש</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>שעות שבוצעו</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>יעד שעות</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '28%' }}>התקדמות מול היעד</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>סטטוס פעילות</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStats.map((row) => {
              const pct = Math.min(100, Math.round(((row.total_hours || 0) / goalHours) * 100));
              const isGoalReached = (row.total_hours || 0) >= goalHours;
              const remainingHours = Math.max(0, goalHours - (row.total_hours || 0));
              const hasZeroShifts = (row.shift_count || 0) === 0;
              const hasUnderMinShifts = (row.shift_count || 0) < 2;

              return (
                <TableRow
                  key={row.user_id}
                  hover
                  sx={{ bgcolor: hasZeroShifts ? '#fff5f5' : 'inherit' }}
                >
                  <TableCell sx={{ fontWeight: 500 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{row.user_name}</span>
                      {hasZeroShifts && (
                        <Chip label="לא פעיל החודש" color="error" size="small" variant="outlined" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {hasZeroShifts ? (
                      <Chip label="0 משמרות" color="error" size="small" />
                    ) : hasUnderMinShifts ? (
                      <Chip label={`${row.shift_count} (מתחת למינימום)`} color="warning" size="small" />
                    ) : (
                      <Chip label={`${row.shift_count} משמרות`} color="success" size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{(row.total_hours || 0).toFixed(1)}</TableCell>
                  <TableCell>{goalHours}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: '100%', mr: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          color={isGoalReached ? 'success' : 'primary'}
                          sx={{ height: 10, borderRadius: 5 }}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 35 }}>
                        {pct}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {isGoalReached ? (
                      <Chip icon={<CheckCircleIcon />} label="עמד ביעד" color="success" size="small" />
                    ) : (
                      <Chip label={`${remainingHours.toFixed(1)} שעות נותרו`} variant="outlined" size="small" />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredStats.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  לא נמצאו מתנדבים העונים לקריטריוני הסינון שנבחרו
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Shifts gaps section */}
      {shiftsGaps.length > 0 && (
        <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #ffcdd2', bgcolor: '#ffebee', mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" color="error.main" gutterBottom>
            שים לב: קיימים {shiftsGaps.length} חורים במשמרות החודש (משמרות ללא מתנדבים כלל)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            מומלץ לפנות למתנדבים שלקחו 0 משמרות או טרם הגיעו למינימום 2 משמרות, ולשבץ אותם למשמרות הריקות.
          </Typography>
        </Paper>
      )}

      {/* Official signature block for printed PDF */}
      <Box className="print-only" sx={{ display: 'none', mt: 6, pt: 3, borderTop: '1px solid #ccc' }}>
        <Grid container spacing={4}>
          <Grid item xs={6}>
            <Typography variant="body2">שם מנהל הסלון: ___________________________</Typography>
          </Grid>
          <Grid item xs={6} sx={{ textAlign: 'left' }}>
            <Typography variant="body2">חתימה וחותמת: ___________________________</Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Print CSS styling */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          body {
            direction: rtl !important;
            font-family: 'Rubik', Arial, sans-serif !important;
            background: white !important;
          }
          .reports-container {
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
          .MuiPaper-root {
            box-shadow: none !important;
            border: 1px solid #ddd !important;
          }
          nav, aside, .MuiDrawer-root, .MuiAppBar-root {
            display: none !important;
          }
          main {
            margin: 0 !important;
            width: 100% !important;
            padding: 0 !important;
          }
        }
      `}} />
    </Container>
  );
};

export default ReportsPage;
