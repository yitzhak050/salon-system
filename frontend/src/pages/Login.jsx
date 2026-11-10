import React, { useState, useEffect } from 'react';
import {
  Container, Paper, Typography, TextField, Button, Box, Alert,
  IconButton, InputAdornment, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, FormControlLabel, Checkbox, Link
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import SecurityIcon from '@mui/icons-material/Security';
import * as api from '../services/api';

const WHATSAPP_URL = 'https://wa.me/972502470908?text=' + encodeURIComponent('הגעתי מהאתר של יוצאים לשינוי');
const LINKEDIN_URL = 'https://www.linkedin.com/in/050yitzhak';

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
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        bgcolor: '#f8fafc',
        '&::before': logoUrl ? {
          content: '""',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url("${logoUrl}")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: '360px',
          opacity: 0.06,
          pointerEvents: 'none',
          zIndex: 0
        } : {}
      }}
    >
      <Container component="main" maxWidth="xs" sx={{ position: 'relative', zIndex: 1, py: 4 }}>
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
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
              <Button
                variant="text"
                size="small"
                onClick={() => setForgotPasswordOpen(true)}
                sx={{ color: 'text.secondary', textTransform: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                שכחתי סיסמה?
              </Button>
            </Box>
          </Box>

          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Typography variant="caption" color="text.disabled" align="center">
                נבנה ליוצאים לשינוי על ידי{' '}
                <a href="mailto:Yitzchak.gross@gmail.com" style={{ color: 'inherit', textDecoration: 'underline' }}>
                  יצחק גרוס
                </a>
              </Typography>
              <IconButton
                component="a"
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                sx={{ color: '#25D366', p: 0.3 }}
                aria-label="וואטסאפ"
              >
                <WhatsAppIcon sx={{ fontSize: 18 }} />
              </IconButton>
              <IconButton
                component="a"
                href={LINKEDIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                sx={{ color: '#0A66C2', p: 0.3 }}
                aria-label="לינקדאין"
              >
                <LinkedInIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>

            <Link
              component="button"
              type="button"
              variant="caption"
              onClick={() => setPrivacyPolicyOpen(true)}
              sx={{
                color: 'text.disabled',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '0.7rem',
                '&:hover': { color: 'text.secondary' }
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
    </Box>
  );
};

export default Login;
