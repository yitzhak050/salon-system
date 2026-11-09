import React, { useState } from 'react';
import {
  Container, Paper, Typography, TextField, Button, Box, Alert,
  IconButton, InputAdornment, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import * as api from '../services/api';

const Login = ({ onLogin }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.login(phone, password);
      onLogin(res.data.access_token);
    } catch (err) {
      setError('פרטי התחברות שגויים');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={3} sx={{ p: 4, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
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
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 1.5 }}
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
        <Typography variant="caption" color="text.disabled" align="center" sx={{ mt: 3 }}>
          נבנה ליוצאים לשינוי על ידי{' '}
          <a href="mailto:Yitzchak.gross@gmail.com" style={{ color: 'inherit', textDecoration: 'underline' }}>
            יצחק גרוס
          </a>
        </Typography>
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
    </Container>
  );
};

export default Login;
