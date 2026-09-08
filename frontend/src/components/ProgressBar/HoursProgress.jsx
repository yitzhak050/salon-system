import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';

const HoursProgress = ({ totalHours = 0, goalHours = 60, periodLabel = 'שנתי' }) => {
  const percentage = Math.min(100, Math.round((totalHours / goalHours) * 100));
  const remaining = Math.max(0, goalHours - totalHours);
  
  let color = 'primary';
  if (percentage >= 80) color = 'success';
  else if (percentage >= 40) color = 'warning';
  else color = 'error';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress variant="determinate" value={100} sx={{ color: 'grey.300' }} size={130} thickness={4.5} />
        <CircularProgress variant="determinate" value={percentage} color={color} size={130} thickness={4.5} sx={{ position: 'absolute', left: 0 }} />
        <Box
          sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="h5" component="div" fontWeight="bold" color="text.primary">
            {Math.round(percentage)}%
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {periodLabel}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="h6" fontWeight="bold">{totalHours} שעות שבוצעו</Typography>
        <Typography variant="body2" color="text.secondary">מתוך יעד {periodLabel} של {goalHours} שעות</Typography>
        {remaining > 0 ? (
          <Typography variant="body2" color="primary.main" sx={{ mt: 0.5, fontWeight: 500 }}>
            נותרו עוד {remaining.toFixed(1)} שעות ליעד
          </Typography>
        ) : (
          <Typography variant="body2" color="success.main" fontWeight="bold" sx={{ mt: 0.5 }}>
            כל הכבוד! הגעת ליעד ה{periodLabel} 🎉
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default HoursProgress;
