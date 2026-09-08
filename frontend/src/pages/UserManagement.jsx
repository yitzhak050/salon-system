import React, { useState, useEffect, useContext } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableHead, TableRow, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Select, FormControl, InputLabel,
  Chip, IconButton, Alert, Snackbar, Tooltip, Card, CardContent
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import BlockIcon from '@mui/icons-material/Block';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import * as api from '../services/api';
import { AuthContext } from '../App';

const roleLabels = {
  SALON_MANAGER: 'מנהל סלון',
  SALON_OPERATOR: 'מפעיל סלון',
  EVENT_VOLUNTEER: 'מתנדב אירועים'
};

const roleColors = {
  SALON_MANAGER: 'secondary',
  SALON_OPERATOR: 'primary',
  EVENT_VOLUNTEER: 'default'
};

const UserManagement = () => {
  const { user: currentUser } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: 'info', open: false });

  const [yearlyStats, setYearlyStats] = useState({});

  // Add User Dialog State
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    phone: '',
    role: 'EVENT_VOLUNTEER',
    password: ''
  });

  // Reset Password Dialog State
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const isManager = currentUser?.role === 'SALON_MANAGER';

  const showNotification = (text, type = 'success') => {
    setMessage({ text, type, open: true });
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const year = new Date().getFullYear();
      const [usersRes, statsRes] = await Promise.all([
        api.getUsers(),
        api.getAllUsersYearlyStats(year).catch(() => ({ data: {} })) // don't fail if stats fail
      ]);
      setUsers(usersRes.data || []);
      setYearlyStats(statsRes.data || {});
    } catch (e) {
      showNotification('שגיאה בטעינת משתמשים', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserData.name || !newUserData.phone || !newUserData.password) {
      showNotification('נא למלא את כל השדות החובה', 'warning');
      return;
    }
    try {
      await api.createUser(newUserData);
      showNotification('המשתמש נוצר בהצלחה');
      setAddDialogOpen(false);
      setNewUserData({ name: '', phone: '', role: 'EVENT_VOLUNTEER', password: '' });
      fetchUsers();
    } catch (e) {
      showNotification(e.response?.data?.detail || 'שגיאה ביצירת משתמש', 'error');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      showNotification('סיסמה חייבת להכיל לפחות 4 תווים', 'warning');
      return;
    }
    try {
      await api.resetPassword(selectedUser.id, newPassword);
      showNotification(`הסיסמה של ${selectedUser.name} עודכנה בהצלחה`);
      setResetDialogOpen(false);
      setNewPassword('');
      setSelectedUser(null);
    } catch (e) {
      showNotification('שגיאה באיפוס סיסמה', 'error');
    }
  };

  const handleDeactivate = async (u) => {
    if (!window.confirm(`האם אתה בטוח שברצונך להשבית את המשתמש ${u.name}?`)) return;
    try {
      await api.deactivateUser(u.id);
      showNotification(`המשתמש ${u.name} הושבת בהצלחה`);
      fetchUsers();
    } catch (e) {
      showNotification('שגיאה בהשבתת משתמש', 'error');
    }
  };

  const handleHardDelete = async (u) => {
    if (!window.confirm(`האם אתה בטוח שברצונך למחוק משתמש זה לצמיתות? (${u.name})`)) return;
    try {
      await api.hardDeleteUser(u.id);
      showNotification(`המשתמש ${u.name} נמחק לצמיתות`);
      fetchUsers();
    } catch (e) {
      showNotification('שגיאה במחיקת משתמש לצמיתות, ייתכן ויש לו משמרות משויכות', 'error');
    }
  };

  const handleDownloadReport = async (u) => {
    try {
      const year = new Date().getFullYear();
      const res = await api.downloadAdminVolunteerPdf(u.id, year);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `volunteer_report_${u.name}_${year}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch (e) {
      showNotification('שגיאה בהורדת דוח מתנדב', 'error');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          ניהול משתמשים
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchUsers} disabled={loading}>
            רענן
          </Button>
          {isManager && (
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={() => setAddDialogOpen(true)}
            >
              הוסף משתמש חדש
            </Button>
          )}
        </Box>
      </Box>

      {!isManager && (
        <Card sx={{ mb: 3, bgcolor: 'primary.50' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>הפרטים שלי</Typography>
            <Typography variant="body1">שם: {currentUser?.name}</Typography>
            <Typography variant="body2" color="text.secondary">תפקיד: {roleLabels[currentUser?.role] || currentUser?.role}</Typography>
          </CardContent>
        </Card>
      )}

      <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 2, boxShadow: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: 'grey.100' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>שם מלא</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>מספר טלפון</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>תפקיד</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>סטטוס</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>שעות שנתיות</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>תאריך יצירה</TableCell>
              {isManager && <TableCell align="center" sx={{ fontWeight: 'bold' }}>פעולות</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell sx={{ fontWeight: 500 }}>{u.name}</TableCell>
                <TableCell dir="ltr" align="right">{u.phone}</TableCell>
                <TableCell>
                  <Chip
                    label={roleLabels[u.role] || u.role}
                    color={roleColors[u.role] || 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={u.is_active ? 'פעיל' : 'לא פעיל'}
                    color={u.is_active ? 'success' : 'error'}
                    variant="outlined"
                    size="small"
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  {yearlyStats[u.id] || 0}
                </TableCell>
                <TableCell>{new Date(u.created_at).toLocaleDateString('he-IL')}</TableCell>
                {isManager && (
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                      <Tooltip title="הורד דוח שעות">
                        <IconButton
                          color="info"
                          size="small"
                          onClick={() => handleDownloadReport(u)}
                        >
                          <PictureAsPdfIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="איפוס סיסמה">
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => {
                            setSelectedUser(u);
                            setResetDialogOpen(true);
                          }}
                        >
                          <VpnKeyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {u.is_active && u.id !== currentUser?.user_id && (
                        <Tooltip title="השבת משתמש">
                          <IconButton
                            color="warning"
                            size="small"
                            onClick={() => handleDeactivate(u)}
                          >
                            <BlockIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {u.id !== currentUser?.user_id && (
                        <Tooltip title="מחק לצמיתות">
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleHardDelete(u)}
                          >
                            <DeleteForeverIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {users.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={isManager ? 7 : 6} align="center" sx={{ py: 3 }}>
                  לא נמצאו משתמשים במערכת
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Add User Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleCreateUser}>
          <DialogTitle fontWeight="bold">הוספת משתמש חדש</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="שם מלא"
                required
                fullWidth
                value={newUserData.name}
                onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
              />
              <TextField
                label="מספר טלפון"
                required
                fullWidth
                placeholder="0501234567"
                value={newUserData.phone}
                onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
              />
              <FormControl fullWidth>
                <InputLabel>תפקיד</InputLabel>
                <Select
                  value={newUserData.role}
                  label="תפקיד"
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                >
                  <MenuItem value="EVENT_VOLUNTEER">מתנדב אירועים</MenuItem>
                  <MenuItem value="SALON_OPERATOR">מפעיל סלון</MenuItem>
                  <MenuItem value="SALON_MANAGER">מנהל סלון</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="סיסמה ראשונית"
                type="password"
                required
                fullWidth
                value={newUserData.password}
                onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setAddDialogOpen(false)}>ביטול</Button>
            <Button type="submit" variant="contained">צור משתמש</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleResetPassword}>
          <DialogTitle fontWeight="bold">איפוס סיסמה</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              הגדר סיסמה חדשה עבור <strong>{selectedUser?.name}</strong> ({selectedUser?.phone}):
            </Typography>
            <TextField
              label="סיסמה חדשה"
              type="password"
              required
              fullWidth
              autoFocus
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setResetDialogOpen(false)}>ביטול</Button>
            <Button type="submit" variant="contained" color="primary">עדכן סיסמה</Button>
          </DialogActions>
        </form>
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

export default UserManagement;
