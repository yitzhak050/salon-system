import React, { useState, useEffect } from 'react';
import {
  Container, Paper, Typography, TextField, Button, Box, Alert,
  IconButton, InputAdornment, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, FormControlLabel, Checkbox, Link
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SecurityIcon from '@mui/icons-material/Security';
import * as api from '../services/api';

const Login = ({ onLogin }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [privacyPolicyOpen, setPrivacyPolicyOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    api.getPublicSettings()
      .then(res => {
        if (res.data?.logo_url) {
          setLogoUrl(res.data.logo_url);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.login(phone, password);
      onLogin(res.data.access_token, rememberMe);
    } catch (err) {
      setError('פרטי התחברות שגויים');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: 3 }}>
        {logoUrl && (
          <Box sx={{ mb: 2, textAlign: 'center' }}>
            <Box
              component="img"
              src={logoUrl}
              alt="לוגו האתר"
              sx={{ maxHeight: 85, maxWidth: '100%', objectFit: 'contain' }}
            />
          </Box>
        )}
        <Typography component="h1" variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
          מערכת ניהול התנדבות
        </Typography>
        {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="phone"
            label="מספר טלפון"
            name="phone"
            autoComplete="tel"
            autoFocus
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="סיסמה"
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    aria-label="הצג/הסתר סיסמה"
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                color="primary"
              />
            }
            label="השאר אותי מחובר לחודש (30 יום)"
            sx={{ mt: 0.5 }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 2, mb: 1.5 }}
            disabled={loading}
          >
            התחבר
          </Button>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Button
              variant="text"
              size="small"
              onClick={() => setForgotPasswordOpen(true)}
              sx={{ color: 'text.secondary', textTransform: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              שכחתי סיסמה?
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" align="center">
            מערכת זו מיועדת לשימוש מורשה בלבד
          </Typography>
        </Box>
        <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              נבנה ליוצאים לשינוי על ידי יצחק גרוס
            </Typography>
            <IconButton
              component="a"
              href="https://wa.me/972502470908?text=%D7%94%D7%92%D7%A2%D7%AA%D7%99%20%D7%9E%D7%94%D7%90%D7%AA%D7%A8%20%D7%A9%D7%97%20%D7%99%D7%95%D7%A6%D7%90%D7%99%D7%9D%20%D7%9C%D7%A9%D7%99%D7%A0%D7%95%D7%99"
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              sx={{
                color: '#25D366',
                p: 0.5,
                '&:hover': { bgcolor: 'rgba(37, 211, 102, 0.1)' }
              }}
              title="פנייה בוואטסאפ ליצחק גרוס"
            >
              <WhatsAppIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>

          {/* הצהרת פרטיות קטנה */}
          <Link
            component="button"
            variant="caption"
            onClick={() => setPrivacyPolicyOpen(true)}
            sx={{
              color: 'text.secondary',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '0.75rem',
              '&:hover': { color: 'primary.main' }
            }}
          >
            הצהרת פרטיות
          </Link>
        </Box>
      </Paper>

      {/* Forgot Password Dialog */}
      <Dialog
        open={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle fontWeight="bold">שחזור סיסמה</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: '1.05rem', color: 'text.primary', mt: 1 }}>
            נא לפנות לאחראי לקבלת סיסמה חדשה או איפוס סיסמתך במערכת.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setForgotPasswordOpen(false)} variant="contained" autoFocus>
            הבנתי, תודה
          </Button>
        </DialogActions>
      </Dialog>

      {/* Privacy Policy Dialog */}
      <Dialog
        open={privacyPolicyOpen}
        onClose={() => setPrivacyPolicyOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
          <SecurityIcon color="primary" fontSize="small" />
          הצהרת פרטיות
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: '1rem', color: 'text.primary', mt: 1, lineHeight: 1.6 }}>
            כל המידע שנתתם נשמר רק לצורך תפעול האתר.
            <br /><br />
            כל המידע שנשמר שקוף לכם, וניתן למחוק את כל הנתונים בכל עת על ידי בקשה מהאחראי.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPrivacyPolicyOpen(false)} variant="contained" autoFocus>
            הבנתי, סגור
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Login;
