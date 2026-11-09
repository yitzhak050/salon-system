import React, { useState, useEffect, useContext } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableHead, TableRow, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Select, FormControl, InputLabel,
  Chip, IconButton, Alert, Snackbar, Tooltip, Card, CardContent, Divider
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
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
    email: '',
    role: 'EVENT_VOLUNTEER',
    password: ''
  });

  // Bulk Excel Import Dialog State
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

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
      await api.createUser({
        ...newUserData,
        email: newUserData.email?.trim() || null
      });
      showNotification('המשתמש נוצר בהצלחה');
      setAddDialogOpen(false);
      setNewUserData({ name: '', phone: '', email: '', role: 'EVENT_VOLUNTEER', password: '' });
      fetchUsers();
    } catch (e) {
      showNotification(e.response?.data?.detail || 'שגיאה ביצירת משתמש', 'error');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.downloadUsersExcelTemplate();
      const url = window.URL.createObjectURL(
        new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      );
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'users_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      showNotification('שגיאה בהורדת קובץ לדוגמה', 'error');
    }
  };

  const handleBulkImport = async (e) => {
    e.preventDefault();
    if (!excelFile) {
      showNotification('נא לבחור קובץ אקסל (.xlsx) או CSV', 'warning');
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const res = await api.bulkImportUsers(excelFile);
      setImportResult(res.data);
      showNotification(`נוצרו ${res.data.created_count} משתמשים חדשים בהצלחה!`);
      fetchUsers();
    } catch (e) {
      showNotification(e.response?.data?.detail || 'שגיאה בייבוא קובץ המשתמשים', 'error');
    } finally {
      setImporting(false);
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
      const action = u.is_active ? 'הושבת' : 'הופעל מחדש';
      showNotification(`המשתמש ${u.name} ${action} בהצלחה`);
      fetchUsers();
    } catch (e) {
      showNotification('שגיאה בשינוי סטטוס משתמש', 'error');
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1.5 }}>
        <Typography variant="h4" fontWeight="bold">
          ניהול משתמשים
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchUsers} disabled={loading}>
            רענן
          </Button>
          {isManager && (
            <>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<UploadFileIcon />}
                onClick={() => {
                  setExcelFile(null);
                  setImportResult(null);
                  setImportDialogOpen(true);
                }}
              >
                העלאת קובץ אקסל
              </Button>
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={() => setAddDialogOpen(true)}
              >
                הוסף משתמש חדש
              </Button>
            </>
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

      <Paper sx={{ width: '100%', overflow: 'auto', borderRadius: 2, boxShadow: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: 'grey.100' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>שם מלא</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>מספר טלפון</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>אימייל</TableCell>
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
                <TableCell dir="ltr" align="right">{u.email || '—'}</TableCell>
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
                      {u.id !== currentUser?.user_id && (
                        <Tooltip title={u.is_active ? 'השבת משתמש (ימנע התחברות)' : 'הפעל משתמש מחדש'}>
                          <IconButton
                            color={u.is_active ? 'warning' : 'success'}
                            size="small"
                            onClick={() => handleDeactivate(u)}
                          >
                            {u.is_active ? <BlockIcon fontSize="small" /> : <CheckCircleOutlineIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      )}
                      {u.id !== currentUser?.user_id && (
                        <Tooltip title="מחק לצמיתות (כולל כל המשמרות שלו)">
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
                <TableCell colSpan={isManager ? 8 : 7} align="center" sx={{ py: 3 }}>
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
              <TextField
                label="אימייל (אופציונלי)"
                type="email"
                fullWidth
                placeholder="example@email.com"
                value={newUserData.email}
                onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
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

      {/* Bulk Excel Import Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleBulkImport}>
          <DialogTitle fontWeight="bold">ייבוא משתמשים מקובץ אקסל / CSV</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Alert severity="info">
                העלה קובץ אקסל (<strong>.xlsx</strong>) או CSV עם העמודות הבאות בשורה הראשונה:
                <br />
                <strong>שם מלא | מספר טלפון | סיסמא</strong> (וניתן להוסיף גם עמודת <strong>אימייל</strong>).
                <br />
                כל הסיסמאות מוצפנות אוטומטית (Hash) לפני שמירתן במסד הנתונים.
              </Alert>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  רוצה תבנית מוכנה למילוי?
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownloadTemplate}
                >
                  הורד קובץ אקסל לדוגמה
                </Button>
              </Box>

              <Divider />

              <Button
                variant="outlined"
                component="label"
                startIcon={<UploadFileIcon />}
                sx={{ py: 1.5, borderStyle: 'dashed' }}
              >
                {excelFile ? `נבחר: ${excelFile.name}` : 'בחר קובץ אקסל (.xlsx) או CSV מהמחשב'}
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  hidden
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setExcelFile(e.target.files[0]);
                      setImportResult(null);
                    }
                  }}
                />
              </Button>

              {importResult && (
                <Box sx={{ mt: 1 }}>
                  <Alert severity={importResult.created_count > 0 ? 'success' : 'warning'} sx={{ mb: 1 }}>
                    נוצרו <strong>{importResult.created_count}</strong> משתמשים חדשים.
                    {importResult.skipped_count > 0 && ` (דולגו ${importResult.skipped_count} שורות)`}
                  </Alert>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <Paper variant="outlined" sx={{ p: 1.5, maxHeight: 150, overflow: 'auto', bgcolor: 'grey.50' }}>
                      <Typography variant="caption" fontWeight="bold" display="block" gutterBottom>
                        פירוט שורות שדולגו:
                      </Typography>
                      {importResult.errors.map((err, idx) => (
                        <Typography key={idx} variant="caption" display="block" color="text.secondary">
                          • {err}
                        </Typography>
                      ))}
                    </Paper>
                  )}
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setImportDialogOpen(false)}>סגור</Button>
            <Button type="submit" variant="contained" disabled={!excelFile || importing}>
              {importing ? 'מייבא משתמשים...' : 'העלה וצור משתמשים'}
            </Button>
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
