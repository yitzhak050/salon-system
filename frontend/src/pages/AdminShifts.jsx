import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Grid, Card, CardContent,
  Button, MenuItem, Select, FormControl, InputLabel, Dialog,
  DialogTitle, DialogContent, DialogActions, List, ListItem,
  ListItemText, ListItemSecondaryAction, IconButton, Chip, Alert,
  Snackbar, Stack, Divider, Tooltip, Switch, FormControlLabel,
  TextField, ToggleButton, ToggleButtonGroup, Slider
} from '@mui/material';
import ShiftCalendar from '../components/Calendar/ShiftCalendar';
import { formatHebrewDate, shiftSlotLabel } from '../utils/dateUtils';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import * as api from '../services/api';

const AdminShifts = () => {
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [shifts, setShifts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Single shift modal state
  const [selectedShift, setSelectedShift] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState('');
  const [shiftCapacity, setShiftCapacity] = useState(1);
  const [shiftTitleEdit, setShiftTitleEdit] = useState('');

  // Edit volunteer hours within shift
  const [editingAssignmentId, setEditingAssignmentId] = useState(null);
  const [editHoursRange, setEditHoursRange] = useState([10, 14]);
  const [editHoursManual, setEditHoursManual] = useState('');

  // Create event/shift modal state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    date: new Date().toISOString().split('T')[0],
    slot: 'MORNING',
    title: '',
    max_volunteers: 1
  });

  // Bulk actions state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedShiftIds, setSelectedShiftIds] = useState([]);
  const [bulkVolunteerId, setBulkVolunteerId] = useState('');
  const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = useState(false);

  const [message, setMessage] = useState({ text: '', type: 'info', open: false });

  const showNotification = (text, type = 'success') => {
    setMessage({ text, type, open: true });
  };

  const fetchShiftsAndUsers = async () => {
    setLoading(true);
    try {
      const [shiftsRes, usersRes] = await Promise.all([
        api.getShifts(month, year),
        api.getUsers()
      ]);
      setShifts(shiftsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (e) {
      console.error(e);
      showNotification('שגיאה בטעינת נתונים', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedShiftIds([]);
    fetchShiftsAndUsers();
  }, [month, year]);

  const handleGenerateShifts = async () => {
    try {
      await api.generateShifts(month, year);
      showNotification('משמרות החודש נוצרו בהצלחה (ללא ימי שישי ושבת)');
      fetchShiftsAndUsers();
    } catch (e) {
      showNotification('שגיאה בייצור משמרות', 'error');
    }
  };

  const handleDeleteWeekends = async () => {
    if (!window.confirm('האם למחוק את כל המשמרות שנוצרו בימי שישי ושבת לחודש זה?')) return;
    try {
      const res = await api.deleteWeekendShifts(month, year);
      showNotification(`נמחקו ${res.data?.deleted_weekends || 0} משמרות סופ"ש בהצלחה`);
      fetchShiftsAndUsers();
    } catch (e) {
      showNotification('שגיאה במחיקת משמרות סופ"ש', 'error');
    }
  };

  const formatHour = (val) => {
    const h = Math.floor(val);
    const m = Math.round((val - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Click on a shift (single shift mode)
  const handleShiftClick = (shift) => {
    setSelectedShift(shift);
    setSelectedVolunteerId('');
    setShiftCapacity(shift.max_volunteers || 1);
    setShiftTitleEdit(shift.title || '');
    setEditingAssignmentId(null);
    setDialogOpen(true);
  };

  const handleStartEditAssignment = (assignment, slot) => {
    setEditingAssignmentId(assignment.id);
    let initialStart = 10;
    let initialEnd = 14;
    if (slot === 'AFTERNOON') { initialStart = 14; initialEnd = 18; }
    else if (slot === 'EVENING') { initialStart = 18; initialEnd = 22; }

    if (assignment.notes && assignment.notes.includes('שעות:')) {
      const match = assignment.notes.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
      if (match) {
        initialStart = parseInt(match[1]) + parseInt(match[2]) / 60;
        initialEnd = parseInt(match[3]) + parseInt(match[4]) / 60;
      }
    }
    setEditHoursRange([initialStart, initialEnd]);
    const duration = assignment.hours_logged != null ? assignment.hours_logged : (initialEnd - initialStart);
    setEditHoursManual(String(duration));
  };

  const handleSaveAssignmentHours = async (assignmentId) => {
    try {
      const hoursNum = parseFloat(editHoursManual);
      const startStr = formatHour(editHoursRange[0]);
      const endStr = formatHour(editHoursRange[1]);
      const hoursLogged = !isNaN(hoursNum) && hoursNum >= 0 ? hoursNum : (editHoursRange[1] - editHoursRange[0]);
      const notes = `שעות: ${startStr}-${endStr} (עודכן ע"י מנהל)`;

      await api.updateAssignment(assignmentId, {
        hours_logged: hoursLogged,
        notes: notes
      });

      showNotification('שעות המתנדב עודכנו בהצלחה!');
      setEditingAssignmentId(null);
      await fetchShiftsAndUsers();
      // Update selectedShift in place
      setSelectedShift(prev => {
        if (!prev) return prev;
        const updatedAssignments = prev.assignments?.map(a =>
          a.id === assignmentId ? { ...a, hours_logged: hoursLogged, notes: notes } : a
        );
        return { ...prev, assignments: updatedAssignments };
      });
    } catch (e) {
      showNotification(e.response?.data?.detail || 'שגיאה בעדכון שעות', 'error');
    }
  };

  // Toggle shift selection
  const handleToggleSelectShift = (shiftId) => {
    setSelectedShiftIds(prev =>
      prev.includes(shiftId) ? prev.filter(id => id !== shiftId) : [...prev, shiftId]
    );
  };

  // Select all shifts of a single day
  const handleSelectDay = (dayShifts) => {
    const dayIds = dayShifts.map(s => s.id);
    const allAlreadySelected = dayIds.every(id => selectedShiftIds.includes(id));
    if (allAlreadySelected) {
      setSelectedShiftIds(prev => prev.filter(id => !dayIds.includes(id)));
    } else {
      setSelectedShiftIds(prev => Array.from(new Set([...prev, ...dayIds])));
    }
  };

  // Select all shifts in the month
  const handleSelectAllInMonth = () => {
    if (selectedShiftIds.length === shifts.length) {
      setSelectedShiftIds([]);
    } else {
      setSelectedShiftIds(shifts.map(s => s.id));
    }
  };

  // Select all shifts of a specific slot (Morning, Afternoon, Evening)
  const handleSelectBySlot = (slot) => {
    const slotShiftIds = shifts.filter(s => s.slot === slot).map(s => s.id);
    const allAlreadySelected = slotShiftIds.every(id => selectedShiftIds.includes(id));
    if (allAlreadySelected) {
      setSelectedShiftIds(prev => prev.filter(id => !slotShiftIds.includes(id)));
    } else {
      setSelectedShiftIds(prev => Array.from(new Set([...prev, ...slotShiftIds])));
    }
  };

  // Select only empty shifts (holes)
  const handleSelectOnlyHoles = () => {
    const holeIds = shifts.filter(s => !s.assignments || s.assignments.length === 0).map(s => s.id);
    setSelectedShiftIds(holeIds);
    showNotification(`נבחרו ${holeIds.length} משמרות ריקות (חורים)`);
  };

  // Create new shift / event
  const handleCreateShift = async (e) => {
    e.preventDefault();
    try {
      await api.createShift({
        date: createForm.date,
        slot: createForm.slot,
        title: createForm.title.trim() || null,
        max_volunteers: Number(createForm.max_volunteers) || 1
      });
      showNotification('המשמרת / אירוע נוצרו בהצלחה!');
      setCreateDialogOpen(false);
      setCreateForm({
        date: new Date().toISOString().split('T')[0],
        slot: 'MORNING',
        title: '',
        max_volunteers: 1
      });
      fetchShiftsAndUsers();
    } catch (e) {
      showNotification(e.response?.data?.detail || 'שגיאה ביצירת משמרת', 'error');
    }
  };

  // Update shift capacity or title
  const handleUpdateShiftDetails = async () => {
    try {
      await api.updateShift(selectedShift.id, {
        max_volunteers: Number(shiftCapacity),
        title: shiftTitleEdit.trim() || null
      });
      showNotification('פרטי המשמרת והקיבולת עודכנו בהצלחה');
      setDialogOpen(false);
      fetchShiftsAndUsers();
    } catch (e) {
      showNotification('שגיאה בעדכון פרטי המשמרת', 'error');
    }
  };

  // Single shift delete
  const handleDeleteSingleShift = async () => {
    if (!window.confirm('האם למחוק משמרת זו לחלוטין?')) return;
    try {
      await api.deleteShift(selectedShift.id);
      showNotification('המשמרת נמחקה בהצלחה');
      setDialogOpen(false);
      fetchShiftsAndUsers();
    } catch (e) {
      showNotification('שגיאה במחיקת משמרת', 'error');
    }
  };

  // Single shift assign
  const handleAssignVolunteer = async () => {
    if (!selectedVolunteerId) {
      showNotification('נא לבחור מתנדב', 'warning');
      return;
    }
    try {
      await api.assignShift(selectedShift.id, selectedVolunteerId);
      showNotification('המתנדב שובץ בהצלחה למשמרת');
      setDialogOpen(false);
      fetchShiftsAndUsers();
    } catch (e) {
      showNotification(e.response?.data?.detail || 'שגיאה בשיבוץ מתנדב', 'error');
    }
  };

  // Single shift unassign
  const handleUnassignSingle = async (assignmentId) => {
    try {
      await api.unassignShift(assignmentId);
      showNotification('המתנדב הוסר מהמשמרת');
      setDialogOpen(false);
      fetchShiftsAndUsers();
    } catch (e) {
      showNotification('שגיאה בהסרת מתנדב', 'error');
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedShiftIds.length === 0) return;
    if (!window.confirm(`האם אתה בטוח שברצונך למחוק ${selectedShiftIds.length} משמרות שנבחרו?`)) return;
    try {
      const res = await api.batchDeleteShifts(selectedShiftIds);
      showNotification(`נמחקו ${res.data?.deleted || selectedShiftIds.length} משמרות בהצלחה`);
      setSelectedShiftIds([]);
      fetchShiftsAndUsers();
    } catch (e) {
      showNotification('שגיאה במחיקת משמרות', 'error');
    }
  };

  // Bulk Unassign
  const handleBulkUnassign = async () => {
    if (selectedShiftIds.length === 0) return;
    if (!window.confirm(`האם לפנות את השיבוצים מ-${selectedShiftIds.length} משמרות שנבחרו?`)) return;
    try {
      const res = await api.batchUnassignShifts(selectedShiftIds);
      showNotification(`פונו ${res.data?.unassigned || 0} שיבוצים בהצלחה`);
      setSelectedShiftIds([]);
      fetchShiftsAndUsers();
    } catch (e) {
      showNotification('שגיאה בפינוי שיבוצים', 'error');
    }
  };

  // Bulk Assign
  const handleBulkAssign = async () => {
    if (!bulkVolunteerId || selectedShiftIds.length === 0) return;
    try {
      let successCount = 0;
      for (const sId of selectedShiftIds) {
        try {
          await api.assignShift(sId, bulkVolunteerId);
          successCount++;
        } catch (err) {
          // ignore duplicate/full
        }
      }
      showNotification(`שובצו בהצלחה ${successCount} משמרות עבור המתנדב`);
      setBulkAssignDialogOpen(false);
      setSelectedShiftIds([]);
      setBulkVolunteerId('');
      fetchShiftsAndUsers();
    } catch (e) {
      showNotification('שגיאה בשיבוץ קבוצתי', 'error');
    }
  };

  const emptyShifts = shifts.filter(s => !s.assignments || s.assignments.length === 0);

  return (
    <Container maxWidth="lg" sx={{ mt: 3, mb: 4, px: { xs: 1.5, sm: 3 } }}>
      {/* Header & month controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            ניהול לוח משמרות ואירועים
          </Typography>
          <Typography variant="body2" color="text.secondary">
            שליטה מלאה: קביעת קיבולת מתנדבים (1-3), יצירת משמרות אירועים, וסימון קבוצתי
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 80 }}>
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
              {[currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1].map(y => (
                <MenuItem key={y} value={y}>{y}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            color="success"
            startIcon={<AddCircleOutlineIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            אירוע / משמרת חדשה
          </Button>
          <Button variant="contained" startIcon={<CalendarMonthIcon />} onClick={handleGenerateShifts}>
            ייצור חודש
          </Button>
          <Tooltip title="הסרת משמרות שנוצרו בטעות בימי שישי או שבת">
            <Button variant="outlined" color="secondary" startIcon={<CleaningServicesIcon />} onClick={handleDeleteWeekends}>
              נקה סופ"ש
            </Button>
          </Tooltip>
        </Stack>
      </Box>

      {/* Bulk actions bar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2, boxShadow: 1, bgcolor: isSelectionMode ? '#e3f2fd' : 'background.paper' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={isSelectionMode}
                  onChange={(e) => {
                    setIsSelectionMode(e.target.checked);
                    if (!e.target.checked) setSelectedShiftIds([]);
                  }}
                  color="primary"
                />
              }
              label={
                <Typography fontWeight="bold" sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>
                  מצב סימון ופעולות קבוצתיות
                </Typography>
              }
            />
            {isSelectionMode && (
              <Chip
                label={`${selectedShiftIds.length} נבחרו`}
                color={selectedShiftIds.length > 0 ? 'primary' : 'default'}
                size="small"
              />
            )}
          </Box>

          {isSelectionMode && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {/* Slot selection buttons */}
              <Button size="small" variant="outlined" onClick={() => handleSelectBySlot('MORNING')}>
                בחר כל הבוקר
              </Button>
              <Button size="small" variant="outlined" onClick={() => handleSelectBySlot('AFTERNOON')}>
                בחר כל הצהריים
              </Button>
              <Button size="small" variant="outlined" onClick={() => handleSelectBySlot('EVENING')}>
                בחר כל הערב
              </Button>
              <Button size="small" variant="outlined" onClick={handleSelectAllInMonth}>
                {selectedShiftIds.length === shifts.length ? 'בטל הכל' : 'בחר כל החודש'}
              </Button>
              <Button size="small" variant="outlined" color="warning" onClick={handleSelectOnlyHoles}>
                רק חורים ({emptyShifts.length})
              </Button>
              <Button
                size="small"
                variant="contained"
                color="primary"
                disabled={selectedShiftIds.length === 0}
                startIcon={<GroupAddIcon />}
                onClick={() => setBulkAssignDialogOpen(true)}
              >
                שבץ לנבחרים
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="warning"
                disabled={selectedShiftIds.length === 0}
                startIcon={<PersonOffIcon />}
                onClick={handleBulkUnassign}
              >
                פנה שיבוצים
              </Button>
              <Button
                size="small"
                variant="contained"
                color="error"
                disabled={selectedShiftIds.length === 0}
                startIcon={<DeleteForeverIcon />}
                onClick={handleBulkDelete}
              >
                מחק נבחרים
              </Button>
            </Stack>
          )}
        </Box>
      </Paper>

      {/* Shift holes alert */}
      {emptyShifts.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          קיימות <strong>{emptyShifts.length}</strong> משמרות פתוחות ללא מתנדבים (מסומנות באדום). לחץ על משמרת כדי לשבץ, או עבור למצב בחירה כדי לפעול על כולן יחד.
        </Alert>
      )}

      {/* Calendar */}
      <Paper sx={{ p: { xs: 1.5, sm: 3 }, borderRadius: 2, boxShadow: 2 }}>
        <ShiftCalendar
          shifts={shifts}
          month={month}
          year={year}
          viewMode="admin"
          onShiftClick={handleShiftClick}
          selectedShiftIds={selectedShiftIds}
          onToggleSelectShift={handleToggleSelectShift}
          isSelectionMode={isSelectionMode}
          onSelectDay={handleSelectDay}
        />
      </Paper>

      {/* Dialog: Create Shift / Event */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleCreateShift}>
          <DialogTitle fontWeight="bold">יצירת משמרת / אירוע חדש</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="תאריך"
                type="date"
                required
                fullWidth
                value={createForm.date}
                onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
              <FormControl fullWidth size="small">
                <InputLabel>חלון שעות / משמרת</InputLabel>
                <Select
                  value={createForm.slot}
                  label="חלון שעות / משמרת"
                  onChange={(e) => setCreateForm({ ...createForm, slot: e.target.value })}
                >
                  <MenuItem value="MORNING">בוקר (10:00-14:00)</MenuItem>
                  <MenuItem value="AFTERNOON">צהריים (14:00-18:00)</MenuItem>
                  <MenuItem value="EVENING">ערב (18:00-22:00)</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="כותרת אירוע (אופציונלי)"
                fullWidth
                placeholder="למשל: אירוע קהילתי, סדנה, תגבור..."
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              />
              <FormControl fullWidth size="small">
                <InputLabel>מספר מתנדבים נדרש (קיבולת)</InputLabel>
                <Select
                  value={createForm.max_volunteers}
                  label="מספר מתנדבים נדרש (קיבולת)"
                  onChange={(e) => setCreateForm({ ...createForm, max_volunteers: e.target.value })}
                >
                  <MenuItem value={1}>1 מתנדב (ברירת מחדל - אחראי יחיד)</MenuItem>
                  <MenuItem value={2}>2 מתנדבים</MenuItem>
                  <MenuItem value={3}>3 מתנדבים</MenuItem>
                  <MenuItem value={4}>4 מתנדבים</MenuItem>
                  <MenuItem value={5}>5 מתנדבים</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setCreateDialogOpen(false)}>ביטול</Button>
            <Button type="submit" variant="contained" color="success">
              צור משמרת
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Single Shift Modal */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        {selectedShift && (
          <>
            <DialogTitle fontWeight="bold" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>פרטי משמרת - {formatHebrewDate(selectedShift.date)}</span>
              <IconButton color="error" size="small" onClick={handleDeleteSingleShift} title="מחק משמרת זו לחלוטין">
                <DeleteForeverIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ my: 1 }}>
                <Typography variant="subtitle1">
                  חלון שעות: <strong>{shiftSlotLabel(selectedShift.slot)}</strong>
                </Typography>

                {/* Capacity Configuration by Manager */}
                <Paper sx={{ p: 2, my: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    הגדרת קיבולת וכותרת המשמרת:
                  </Typography>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="כותרת משמרת/אירוע"
                        size="small"
                        fullWidth
                        value={shiftTitleEdit}
                        onChange={(e) => setShiftTitleEdit(e.target.value)}
                        placeholder="למשל: משמרת רגילה, סדנה..."
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>כמות מתנדבים נדרשת</InputLabel>
                        <Select
                          value={shiftCapacity}
                          label="כמות מתנדבים נדרשת"
                          onChange={(e) => setShiftCapacity(e.target.value)}
                        >
                          <MenuItem value={1}>1 מתנדב (אחראי יחיד)</MenuItem>
                          <MenuItem value={2}>2 מתנדבים</MenuItem>
                          <MenuItem value={3}>3 מתנדבים</MenuItem>
                          <MenuItem value={4}>4 מתנדבים</MenuItem>
                          <MenuItem value={5}>5 מתנדבים</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
                    <Button size="small" variant="contained" onClick={handleUpdateShiftDetails}>
                      עדכן קיבולת וכותרת
                    </Button>
                  </Box>
                </Paper>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  מתנדבים רשומים ({selectedShift.assignments?.length || 0} מתוך {selectedShift.max_volunteers || 1}):
                </Typography>
                <List dense sx={{ bgcolor: 'grey.50', borderRadius: 1, my: 1 }}>
                  {selectedShift.assignments && selectedShift.assignments.length > 0 ? (
                    selectedShift.assignments.map(a => (
                      <React.Fragment key={a.id}>
                        <ListItem>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <Typography fontWeight="bold">{a.user_name || 'מתנדב רשום'}</Typography>
                                {a.hours_logged != null && (
                                  <Chip label={`${a.hours_logged} שעות`} size="small" color="success" variant="outlined" />
                                )}
                                {a.notes && <Chip label={a.notes} size="small" variant="outlined" />}
                              </Box>
                            }
                            secondary={
                              a.clock_in ? `נכנס ב-${new Date(a.clock_in).toLocaleTimeString('he-IL')}${a.clock_out ? ` | יצא ב-${new Date(a.clock_out).toLocaleTimeString('he-IL')}` : ''}` : 'טרם ביצע כניסה'
                            }
                          />
                          <ListItemSecondaryAction>
                            <Tooltip title="ערוך שעות (סליידר או הקלדה)">
                              <IconButton
                                edge="end"
                                color="primary"
                                size="small"
                                sx={{ mr: 1 }}
                                onClick={() => {
                                  if (editingAssignmentId === a.id) {
                                    setEditingAssignmentId(null);
                                  } else {
                                    handleStartEditAssignment(a, selectedShift.slot);
                                  }
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="הסר מתנדב ממשמרת זו">
                              <IconButton edge="end" color="error" size="small" onClick={() => handleUnassignSingle(a.id)}>
                                <PersonRemoveIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </ListItemSecondaryAction>
                        </ListItem>

                        {/* Inline Hours Editor for Admin */}
                        {editingAssignmentId === a.id && (
                          <Paper sx={{ p: 2, m: 1, bgcolor: '#eef2f6', borderRadius: 2, border: '1px solid #90caf9' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="subtitle2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <AccessTimeIcon fontSize="small" color="primary" /> עריכת שעות עבור {a.user_name || 'מתנדב'}:
                              </Typography>
                              <IconButton size="small" onClick={() => setEditingAssignmentId(null)}>
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </Box>

                            {/* Slider selection */}
                            <Typography variant="caption" color="text.secondary">
                              בחירה בסליידר: {formatHour(editHoursRange[0])} - {formatHour(editHoursRange[1])} (סה"כ {(editHoursRange[1] - editHoursRange[0]).toFixed(1)} שעות)
                            </Typography>
                            <Box sx={{ px: 2, py: 1 }}>
                              <Slider
                                value={editHoursRange}
                                onChange={(e, val) => {
                                  setEditHoursRange(val);
                                  setEditHoursManual(String(Number((val[1] - val[0]).toFixed(2))));
                                }}
                                min={0}
                                max={24}
                                step={0.5}
                                valueLabelDisplay="auto"
                                valueLabelFormat={formatHour}
                                marks={[
                                  { value: 0, label: '00:00' },
                                  { value: 6, label: '06:00' },
                                  { value: 10, label: '10:00' },
                                  { value: 14, label: '14:00' },
                                  { value: 18, label: '18:00' },
                                  { value: 22, label: '22:00' },
                                  { value: 24, label: '24:00' },
                                ]}
                              />
                            </Box>

                            {/* Manual typing input */}
                            <Grid container spacing={2} alignItems="center" sx={{ mt: 0.5 }}>
                              <Grid item xs={12} sm={6}>
                                <TextField
                                  label="או הקלד סה״כ שעות ידנית"
                                  type="number"
                                  size="small"
                                  fullWidth
                                  value={editHoursManual}
                                  onChange={(e) => setEditHoursManual(e.target.value)}
                                  inputProps={{ step: 0.25, min: 0, max: 24 }}
                                  helperText="למשל: 4, 3.5 או כל כמות שעות"
                                />
                              </Grid>
                              <Grid item xs={12} sm={6} sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => setEditingAssignmentId(null)}
                                >
                                  ביטול
                                </Button>
                                <Button
                                  variant="contained"
                                  color="success"
                                  size="small"
                                  startIcon={<CheckIcon />}
                                  onClick={() => handleSaveAssignmentHours(a.id)}
                                >
                                  שמור שעות
                                </Button>
                              </Grid>
                            </Grid>
                          </Paper>
                        )}
                      </React.Fragment>
                    ))
                  ) : (
                    <ListItem>
                      <ListItemText primary="אין מתנדבים רשומים (משמרת ריקה / חור)" sx={{ color: 'error.main', fontWeight: 'bold' }} />
                    </ListItem>
                  )}
                </List>

                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    שיבוץ מתנדב למשמרת זו:
                  </Typography>
                  <FormControl fullWidth size="small">
                    <InputLabel>בחר מתנדב לשיבוץ</InputLabel>
                    <Select
                      value={selectedVolunteerId}
                      label="בחר מתנדב לשיבוץ"
                      onChange={(e) => setSelectedVolunteerId(e.target.value)}
                    >
                      {users.filter(u => u.is_active).map(u => (
                        <MenuItem key={u.id} value={u.id}>
                          {u.name} ({u.phone})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
              <Button color="error" onClick={handleDeleteSingleShift} startIcon={<DeleteForeverIcon />}>
                מחק משמרת
              </Button>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button onClick={() => setDialogOpen(false)}>סגור</Button>
                <Button
                  variant="contained"
                  startIcon={<PersonAddIcon />}
                  onClick={handleAssignVolunteer}
                  disabled={!selectedVolunteerId}
                >
                  שבץ מתנדב
                </Button>
              </Box>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Bulk Assign Dialog */}
      <Dialog open={bulkAssignDialogOpen} onClose={() => setBulkAssignDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">
          שיבוץ קבוצתי ({selectedShiftIds.length} משמרות)
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            בחר מתנדב שברצונך לשבץ לכל {selectedShiftIds.length} המשמרות המסומנות:
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>בחר מתנדב</InputLabel>
            <Select
              value={bulkVolunteerId}
              label="בחר מתנדב"
              onChange={(e) => setBulkVolunteerId(e.target.value)}
            >
              {users.filter(u => u.is_active).map(u => (
                <MenuItem key={u.id} value={u.id}>
                  {u.name} ({u.phone})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBulkAssignDialogOpen(false)}>ביטול</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleBulkAssign}
            disabled={!bulkVolunteerId}
          >
            שבץ לכולן
          </Button>
        </DialogActions>
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

export default AdminShifts;
