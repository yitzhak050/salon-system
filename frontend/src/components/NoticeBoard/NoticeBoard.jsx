import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Divider,
  Skeleton, Chip
} from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import WifiIcon from '@mui/icons-material/Wifi';
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';
import CampaignIcon from '@mui/icons-material/Campaign';
import * as api from '../../services/api';

const NoticeBoard = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      const res = await api.getPublicSettings();
      setSettings(res.data);
    } catch (e) {
      console.error('Failed to load notice board settings', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();

    const handleUpdate = () => {
      loadSettings();
    };
    window.addEventListener('salon-settings-changed', handleUpdate);
    return () => window.removeEventListener('salon-settings-changed', handleUpdate);
  }, []);

  if (loading) {
    return (
      <Box sx={{ mb: 4 }}>
        <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 3 }} />
      </Box>
    );
  }

  const { logo_url, important_phones, wifi_info, daily_instructions } = settings || {};

  // Don't render if completely empty
  const hasContent = logo_url || important_phones || wifi_info || daily_instructions;
  if (!hasContent) return null;

  return (
    <Paper
      elevation={2}
      sx={{
        p: { xs: 2, sm: 3 },
        mb: 4,
        borderRadius: 3,
        background: 'linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%)',
        border: '1px solid #dbeafe',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* הלוגו מעל הכל במרכז */}
      {logo_url && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2.5
          }}
        >
          <Box
            component="img"
            src={logo_url}
            alt="לוגו האתר"
            sx={{
              maxHeight: { xs: 70, sm: 90 },
              maxWidth: '90%',
              objectFit: 'contain',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.08))'
            }}
          />
        </Box>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CampaignIcon color="primary" />
          <Typography variant="h6" fontWeight="bold" color="primary.dark">
            לוח מודעות ומידע שימושי לסלון
          </Typography>
        </Box>
        <Chip label="מידע עדכני" size="small" color="primary" variant="outlined" />
      </Box>

      <Grid container spacing={2}>
        {/* חלון 1: מספרי טלפון חשובים */}
        <Grid item xs={12} md={4}>
          <Card
            variant="outlined"
            sx={{
              height: '100%',
              borderRadius: 2,
              bgcolor: '#ffffff',
              border: '1px solid #bfdbfe',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(37,99,235,0.08)'
              }
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: '#1d4ed8' }}>
                <PhoneIcon fontSize="small" />
                <Typography variant="subtitle2" fontWeight="bold">
                  מספרי טלפון חשובים
                </Typography>
              </Box>
              <Divider sx={{ mb: 1.5 }} />
              <Typography
                variant="body2"
                color="text.primary"
                sx={{
                  whiteSpace: 'pre-line',
                  lineHeight: 1.6,
                  wordBreak: 'break-word',
                  fontSize: '0.875rem'
                }}
              >
                {important_phones || 'אין כרגע מספרי טלפון מוגדרים'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* חלון 2: סיסמה למחשבים ו-WIFI */}
        <Grid item xs={12} md={4}>
          <Card
            variant="outlined"
            sx={{
              height: '100%',
              borderRadius: 2,
              bgcolor: '#ffffff',
              border: '1px solid #cbd5e1',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(100,116,139,0.08)'
              }
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: '#0f766e' }}>
                <WifiIcon fontSize="small" />
                <Typography variant="subtitle2" fontWeight="bold">
                  סיסמה למחשבים ו-WIFI
                </Typography>
              </Box>
              <Divider sx={{ mb: 1.5 }} />
              <Typography
                variant="body2"
                color="text.primary"
                sx={{
                  whiteSpace: 'pre-line',
                  lineHeight: 1.6,
                  wordBreak: 'break-word',
                  fontSize: '0.875rem'
                }}
              >
                {wifi_info || 'טרם עודכנו פרטי WIFI ומחשבים'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* חלון 3: הוראות שונות למפעיל של היום */}
        <Grid item xs={12} md={4}>
          <Card
            variant="outlined"
            sx={{
              height: '100%',
              borderRadius: 2,
              bgcolor: '#ffffff',
              border: '1px solid #fed7aa',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(234,88,12,0.08)'
              }
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: '#c2410c' }}>
                <AssignmentLateIcon fontSize="small" />
                <Typography variant="subtitle2" fontWeight="bold">
                  הוראות שונות למפעיל של היום
                </Typography>
              </Box>
              <Divider sx={{ mb: 1.5 }} />
              <Typography
                variant="body2"
                color="text.primary"
                sx={{
                  whiteSpace: 'pre-line',
                  lineHeight: 1.6,
                  wordBreak: 'break-word',
                  fontSize: '0.875rem'
                }}
              >
                {daily_instructions || 'אין הוראות מיוחדות להיום'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default NoticeBoard;
