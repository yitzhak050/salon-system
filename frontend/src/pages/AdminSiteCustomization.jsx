import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, TextField, Button, Alert,
  Grid, Card, CardContent, Divider, CircularProgress, IconButton, Tooltip, Stack
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PhoneIcon from '@mui/icons-material/Phone';
import WifiIcon from '@mui/icons-material/Wifi';
import CampaignIcon from '@mui/icons-material/Campaign';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import * as api from '../services/api';

const AdminSiteCustomization = () => {
  const [logoUrl, setLogoUrl] = useState('');
  const [importantPhones, setImportantPhones] = useState('');
  const [wifiInfo, setWifiInfo] = useState('');
  const [dailyInstructions, setDailyInstructions] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.getPublicSettings();
      if (res.data) {
        setLogoUrl(res.data.logo_url || '');
        setImportantPhones(res.data.important_phones || '');
        setWifiInfo(res.data.wifi_info || '');
        setDailyInstructions(res.data.daily_instructions || '');
      }
    } catch (e) {
      setMessage({ text: 'שגיאה בטעינת הגדרות האתר', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ text: 'נא לבחור קובץ תמונה בלבד', type: 'error' });
      return;
    }

    // Limit to ~2MB for DataURL storage
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ text: 'גודל התמונה מוגבל לעד 2MB', type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoUrl(event.target.result);
      setMessage({ text: 'התמונה נטענה בהצלחה! לחץ "שמור שינויים" לסיום', type: 'info' });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      await api.updateSettings({
        logo_url: logoUrl,
        important_phones: importantPhones,
        wifi_info: wifiInfo,
        daily_instructions: dailyInstructions
      });
      setMessage({ text: 'הגדרות האתר עודכנו בהצלחה!', type: 'success' });
      // Dispatch custom event so other components (Navbar, Login, etc.) can refresh if needed
      window.dispatchEvent(new CustomEvent('salon-settings-changed'));
    } catch (e) {
      setMessage({ text: 'שגיאה בשמירת הגדרות האתר', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <div>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            עריכת אתר ולוח מודעות
          </Typography>
          <Typography variant="body1" color="text.secondary">
            ניהול הלוגו שיוצג בכניסה וברקע, ועדכון המידע בלוח המודעות המוצג לכלל המשתמשים.
          </Typography>
        </div>
        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving}
          sx={{ px: 3, py: 1, borderRadius: 2 }}
        >
          {saving ? 'שומר...' : 'שמור שינויים'}
        </Button>
      </Box>

      {message.text && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage({ text: '', type: '' })}>
          {message.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* הגדרת לוגו סמל האתר */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ImageOutlinedIcon color="primary" />
              <Typography variant="h6" fontWeight="bold">
                לוגו / סמל האתר
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              סמל זה (לדוגמה סמל יוצאים לשינוי) יופיע במסך הכניסה, בראש לוח המודעות וברקע המערכת.
            </Typography>

            <Box
              sx={{
                border: '2px dashed #cbd5e1',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                bgcolor: '#f8fafc',
                minHeight: 180,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                mb: 2
              }}
            >
              {logoUrl ? (
                <Box sx={{ position: 'relative', maxWidth: '100%' }}>
                  <img
                    src={logoUrl}
                    alt="לוגו האתר"
                    style={{
                      maxHeight: 140,
                      maxWidth: '100%',
                      objectFit: 'contain',
                      borderRadius: 8
                    }}
                  />
                  <Tooltip title="הסר לוגו">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setLogoUrl('')}
                      sx={{
                        position: 'absolute',
                        top: -10,
                        right: -10,
                        bgcolor: 'background.paper',
                        boxShadow: 2
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              ) : (
                <Box sx={{ color: 'text.secondary' }}>
                  <ImageOutlinedIcon sx={{ fontSize: 48, opacity: 0.4, mb: 1 }} />
                  <Typography variant="body2">טרם הועלה לוגו</Typography>
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadIcon />}
                fullWidth
              >
                העלאת תמונה
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImageUpload}
                />
              </Button>
            </Box>

            <TextField
              label="או הזן קישור (URL) ישיר לתמונה"
              value={logoUrl.startsWith('data:') ? '' : logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              size="small"
              fullWidth
              helperText={logoUrl.startsWith('data:') ? 'תמונה הועלתה מקובץ מקומי' : ''}
            />
          </Paper>
        </Grid>

        {/* תוכן לוח המודעות */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CampaignIcon color="primary" />
              <Typography variant="h6" fontWeight="bold">
                לוח מודעות (מוצג לכלל המשתמשים)
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              שלושת החלונות יוצגו לכל המתנדבים והמפעילים בדף הראשי שלהם.
            </Typography>

            <Stack spacing={3}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <PhoneIcon fontSize="small" color="info" />
                  <Typography variant="subtitle2" fontWeight="bold">
                    חלון 1: מספרי טלפון חשובים
                  </Typography>
                </Box>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={importantPhones}
                  onChange={(e) => setImportantPhones(e.target.value)}
                  placeholder="לדוגמה: אחראי סלון: 050-XXXXXXX, עזרה ראשונה: 101"
                />
              </Box>

              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <WifiIcon fontSize="small" color="secondary" />
                  <Typography variant="subtitle2" fontWeight="bold">
                    חלון 2: סיסמה למחשבים ו-WIFI
                  </Typography>
                </Box>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={wifiInfo}
                  onChange={(e) => setWifiInfo(e.target.value)}
                  placeholder="לדוגמה: רשת: OutForChange, סיסמה: 12345678, מחשב 1 סיסמה: User123"
                />
              </Box>

              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CampaignIcon fontSize="small" color="warning" />
                  <Typography variant="subtitle2" fontWeight="bold">
                    חלון 3: הוראות שונות למפעיל של היום
                  </Typography>
                </Box>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={dailyInstructions}
                  onChange={(e) => setDailyInstructions(e.target.value)}
                  placeholder="הוראות מיוחדות להיום: כיבוד, אירוע בערב, פתיחת מזגנים וכו'"
                />
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AdminSiteCustomization;
