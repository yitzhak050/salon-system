import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import NoticeBoard from '../components/NoticeBoard/NoticeBoard';

const NoticeBoardPage = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          לוח מודעות
        </Typography>
        <Typography variant="body1" color="text.secondary">
          מידע חיוני, מספרי טלפון, סיסמאות והוראות יומיות לצוות הסלון והמתנדבים.
        </Typography>
      </Box>
      <NoticeBoard />
    </Container>
  );
};

export default NoticeBoardPage;
