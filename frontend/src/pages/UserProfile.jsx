import React, { useState, useEffect, useContext } from 'react';
import {
  Container, Typography, Box, Paper, TextField, Button, Grid,
  Chip, Divider, Alert, Snackbar, InputAdornment, IconButton,
  CircularProgress, Collapse
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SaveIcon from '@mui/icons-material/Save';
import * as api from '../services/api';
import { AuthContext } from '../App';

const roleLabels = {
  SALON_MANAGER: 'מנהל סלון',
  SALON_OPERATOR: 'מפעיל סלון',
  EVENT_VOLUNTEER: 'מתנדב אירועים'
};

const UserProfile = () => {
  const { user: currentUser } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  // Password Change State
  const [oldPassword, setOldPassword] = useState('');
  const [oldPasswordVerified, setOldPasswordVerified] = useState(false);
  const [verifyingOld, setVerifyingOld] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [message, setMessage] = useState({ text: '', type: 'info', open: false });

  const showNotification = (text, type = 'success') => {
    setMessage({ text, type, open: true });
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await api.getMyProfile();
      setProfile(res.data);
      setEmail(res.data?.email || '');
    } catch (e) {
      showNotification('שגיאה בטעינת פרטי הפרופיל', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveEmail = async (e) => {
    e.preventDefault();
    setSavingEmail(true);
    try {
      const res = await api.updateMyProfile({ email: email.trim() || null });
      setProfile(res.data);
      showNotification('כתובת האימייל נשמרה בהצלחה');
    } catch (e) {
      showNotification(e.response?.data?.detail || 'שגיאה בשמירת האימייל', 'error');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleVerifyOldPassword = async () => {
    if (!oldPassword) {
      showNotification('נא להזין את הסיסמה הנוכחית', 'warning');
      return;
    }
    setVerifyingOld(true);
    try {
      await api.verifyMyPassword(oldPassword);
      setOldPasswordVerified(true);
    } catch (e) {
      setOldPasswordVerified(false);
      showNotification(e.response?.data?.detail || 'הסיסמה הנוכחית שגויה', 'error');
    } finally {
      setVerifyingOld(false);
    }
  };

  // השורות של הסיסמה החדשה נפתחות ברגע שמקלידים סיסמה ישנה (או מאמתים אותה)
  const showNewPasswordFields = oldPassword.trim().length > 0 || oldPasswordVerified;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!oldPassword) {
      showNotification('נא להזין את הסיסמה הישנה', 'warning');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      showNotification('הסיסמה החדשה חייבת להכיל לפחות 4 תווים', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotification('הסיסמאות החדשות אינן תואמות', 'error');
      return;
    }

    setSavingPassword(true);
    try {
      await api.changeMyPassword(oldPassword, newPassword);
      showNotification('הסיסמה שונתה בהצלחה ונשמרה בצורה מוצפנת!');
      setOldPassword('');
      setOldPasswordVerified(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      showNotification(e.response?.data?.detail || 'שגיאה בשינוי הסיסמה, בדוק שהסיסמה הישנה נכונה', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <AccountCircleIcon color="primary" sx={{ fontSize: 38 }} />
        <Box>
          <Typography variant="h4" fontWeight="bold">
            פרופיל אישי
          </Typography>
          <Typography variant="body2" color="text.secondary">
            צפייה בפרטים אישיים, עדכון כתובת אימייל ושינוי סיסמה
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* כרטיס פרטים אישיים ואימייל */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2, height: '100%' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              הפרטים שלי
            </Typography>
            <Divider sx={{ mb: 2.5 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                label="שם מלא"
                value={profile?.name || currentUser?.name || ''}
                fullWidth
                InputProps={{
                  readOnly: true,
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccountCircleIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                variant="filled"
              />

              <TextField
                label="מספר טלפון"
                value={profile?.phone || ''}
                fullWidth
                dir="ltr"
                InputProps={{
                  readOnly: true,
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                variant="filled"
              />

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  תפקיד במערכת:
                </Typography>
                <Chip
                  label={roleLabels[profile?.role || currentUser?.role] || profile?.role}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              </Box>

              <Divider />

              <form onSubmit={handleSaveEmail}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                  כתובת אימייל
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <TextField
                    label="אימייל"
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    fullWidth
                    dir="ltr"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon color="primary" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<SaveIcon />}
                    disabled={savingEmail}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    {savingEmail ? 'שומר...' : 'שמור אימייל'}
                  </Button>
                </Box>
              </form>
            </Box>
          </Paper>
        </Grid>

        {/* כרטיס שינוי סיסמה */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <LockIcon color="primary" />
              <Typography variant="h6" fontWeight="bold">
                שינוי סיסמה
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              הקלד את הסיסמה הנוכחית שלך כדי לפתוח את האפשרות לבחירת סיסמה חדשה.
            </Typography>
            <Divider sx={{ mb: 2.5 }} />

            <form onSubmit={handleChangePassword}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    label="סיסמה ישנה (נוכחית)"
                    type={showOldPass ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => {
                      setOldPassword(e.target.value);
                      if (oldPasswordVerified) setOldPasswordVerified(false);
                    }}
                    fullWidth
                    required
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowOldPass(!showOldPass)} edge="end" size="small">
                            {showOldPass ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Button
                    variant={oldPasswordVerified ? 'outlined' : 'contained'}
                    color={oldPasswordVerified ? 'success' : 'primary'}
                    onClick={handleVerifyOldPassword}
                    disabled={!oldPassword || verifyingOld}
                    sx={{ minWidth: 95, height: 56 }}
                  >
                    {verifyingOld ? '...' : oldPasswordVerified ? 'אומת ✓' : 'בדוק'}
                  </Button>
                </Box>

                <Collapse in={showNewPasswordFields}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    <Alert severity="info" sx={{ py: 0.5 }}>
                      הקלד פעמיים את הסיסמה החדשה ולחץ על שמור.
                    </Alert>

                    <TextField
                      label="סיסמה חדשה"
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      fullWidth
                      required={showNewPasswordFields}
                      helperText="לפחות 4 תווים"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowNewPass(!showNewPass)} edge="end" size="small">
                              {showNewPass ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />

                    <TextField
                      label="אימות סיסמה חדשה (הקלד שוב)"
                      type={showConfirmPass ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      fullWidth
                      required={showNewPasswordFields}
                      error={passwordsMismatch}
                      helperText={
                        passwordsMismatch
                          ? 'הסיסמאות אינן תואמות'
                          : passwordsMatch
                          ? 'הסיסמאות תואמות ✓'
                          : ''
                      }
                      FormHelperTextProps={{
                        sx: { color: passwordsMatch ? 'success.main' : undefined, fontWeight: passwordsMatch ? 'bold' : undefined }
                      }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            {passwordsMatch && <CheckCircleIcon color="success" sx={{ mr: 0.5 }} fontSize="small" />}
                            <IconButton onClick={() => setShowConfirmPass(!showConfirmPass)} edge="end" size="small">
                              {showConfirmPass ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />

                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      size="large"
                      startIcon={<SaveIcon />}
                      disabled={savingPassword || !passwordsMatch || newPassword.length < 4}
                      fullWidth
                    >
                      {savingPassword ? 'שומר סיסמה...' : 'שמור סיסמה חדשה'}
                    </Button>
                  </Box>
                </Collapse>
              </Box>
            </form>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={message.open}
        autoHideDuration={4500}
        onClose={() => setMessage({ ...message, open: false })}
      >
        <Alert severity={message.type} onClose={() => setMessage({ ...message, open: false })}>
          {message.text}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default UserProfile;
