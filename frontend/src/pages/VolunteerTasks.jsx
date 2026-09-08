import React, { useState, useEffect, useContext } from 'react';
import {
  Container, Typography, Box, Paper, List, ListItem,
  ListItemText, ListItemIcon, Checkbox, TextField, Button,
  Card, CardContent, Divider, Alert, Snackbar
} from '@mui/material';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import LockIcon from '@mui/icons-material/Lock';
import AssignmentIcon from '@mui/icons-material/Assignment';
import * as api from '../services/api';
import { AuthContext } from '../App';

const VolunteerTasks = () => {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [completedTaskIds, setCompletedTaskIds] = useState(new Set());
  const [message, setMessage] = useState({ text: '', type: 'info', open: false });

  const fetchTasks = async () => {
    try {
      const res = await api.getChecklist();
      setTasks(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const toggleTask = (taskId) => {
    const next = new Set(completedTaskIds);
    if (next.has(taskId)) {
      next.delete(taskId);
    } else {
      next.add(taskId);
      setMessage({ text: 'המשימה סומנה כהושלמה!', type: 'success', open: true });
    }
    setCompletedTaskIds(next);
  };

  const getTaskIcon = (title = '') => {
    if (title.includes('זבל') || title.includes('פח')) return <DeleteSweepIcon color="error" />;
    if (title.includes('אור') || title.includes('תאורה')) return <LightbulbIcon color="warning" />;
    if (title.includes('מזגן') || title.includes('מיזוג')) return <AcUnitIcon color="info" />;
    if (title.includes('דלת') || title.includes('נעיל')) return <LockIcon color="secondary" />;
    return <AssignmentIcon color="primary" />;
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          משימות סגירה למשמרת
        </Typography>
        <Typography variant="body1" color="text.secondary">
          רשימת משימות הסגירה של הסלון - נא לסמן כל פעולה שבוצעה לפני נעילת המקום
        </Typography>
      </Box>

      <Paper sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: 2 }}>
        <Box sx={{ p: 2, bgcolor: 'primary.50', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="bold" color="primary.main">
            צ'ק-ליסט סגירה
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {completedTaskIds.size} מתוך {tasks.length} הושלמו
          </Typography>
        </Box>
        <List>
          {tasks.map((task) => {
            const isDone = completedTaskIds.has(task.id);
            return (
              <React.Fragment key={task.id}>
                <ListItem
                  button
                  onClick={() => toggleTask(task.id)}
                  sx={{
                    bgcolor: isDone ? 'success.50' : 'inherit',
                    textDecoration: isDone ? 'line-through' : 'none'
                  }}
                >
                  <ListItemIcon>
                    <Checkbox
                      checked={isDone}
                      color="success"
                    />
                  </ListItemIcon>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {getTaskIcon(task.title)}
                  </ListItemIcon>
                  <ListItemText
                    primary={task.title}
                    secondary={task.description}
                    primaryTypographyProps={{
                      fontWeight: isDone ? 'normal' : 'bold',
                      color: isDone ? 'text.secondary' : 'text.primary'
                    }}
                  />
                </ListItem>
                <Divider />
              </React.Fragment>
            );
          })}
          {tasks.length === 0 && (
            <ListItem sx={{ py: 4, justifyContent: 'center' }}>
              <Typography color="text.secondary">אין משימות סגירה מוגדרות במערכת</Typography>
            </ListItem>
          )}
        </List>
      </Paper>

      <Snackbar
        open={message.open}
        autoHideDuration={3000}
        onClose={() => setMessage({ ...message, open: false })}
      >
        <Alert severity={message.type} onClose={() => setMessage({ ...message, open: false })}>
          {message.text}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default VolunteerTasks;
