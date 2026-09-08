import React, { useState, useEffect, useContext } from 'react';
import {
  Container, Typography, Box, Grid, Card, CardContent, CardActions,
  Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Chip, Alert, Snackbar, Paper, Tooltip, Divider
} from '@mui/material';
import AddTaskIcon from '@mui/icons-material/AddTask';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AssignmentIcon from '@mui/icons-material/Assignment';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import LockIcon from '@mui/icons-material/Lock';
import RefreshIcon from '@mui/icons-material/Refresh';
import * as api from '../services/api';
import { AuthContext } from '../App';

const TaskManagement = () => {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: 'info', open: false });

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', order_index: 0 });

  const isManager = user?.role === 'SALON_MANAGER';

  const showNotification = (text, type = 'success') => {
    setMessage({ text, type, open: true });
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.getChecklist();
      setTasks(res.data || []);
    } catch (e) {
      showNotification('שגיאה בטעינת משימות סגירה', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setCurrentTaskId(null);
    setTaskForm({ title: '', description: '', order_index: tasks.length + 1 });
    setDialogOpen(true);
  };

  const handleOpenEdit = (t) => {
    setIsEditing(true);
    setCurrentTaskId(t.id);
    setTaskForm({ title: t.title, description: t.description || '', order_index: t.order_index || 0 });
    setDialogOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      showNotification('נא להזין כותרת למשימה', 'warning');
      return;
    }
    try {
      if (isEditing) {
        await api.updateChecklistTask(currentTaskId, {
          title: taskForm.title,
          description: taskForm.description
        });
        showNotification('המשימה עודכנה בהצלחה');
      } else {
        await api.createChecklistTask({
          title: taskForm.title,
          description: taskForm.description,
          order_index: Number(taskForm.order_index) || 0
        });
        showNotification('המשימה נוספה בהצלחה ללוח');
      }
      setDialogOpen(false);
      fetchTasks();
    } catch (e) {
      showNotification('שגיאה בשמירת המשימה', 'error');
    }
  };

  const handleDelete = async (t) => {
    if (!window.confirm(`האם למחוק את המשימה "${t.title}"?`)) return;
    try {
      await api.deleteChecklistTask(t.id);
      showNotification('המשימה נמחקה בהצלחה');
      fetchTasks();
    } catch (e) {
      showNotification('שגיאה במחיקת המשימה', 'error');
    }
  };

  const addPreset = async (title, description) => {
    try {
      await api.createChecklistTask({
        title,
        description,
        order_index: tasks.length + 1
      });
      showNotification(`המשימה "${title}" נוספה ללוח`);
      fetchTasks();
    } catch (e) {
      showNotification('שגיאה בהוספת משימה', 'error');
    }
  };

  const getTaskIcon = (title = '') => {
    if (title.includes('זבל') || title.includes('פח')) return <DeleteSweepIcon color="error" fontSize="large" />;
    if (title.includes('אור') || title.includes('תאורה')) return <LightbulbIcon color="warning" fontSize="large" />;
    if (title.includes('מזגן') || title.includes('מיזוג')) return <AcUnitIcon color="info" fontSize="large" />;
    if (title.includes('דלת') || title.includes('נעיל')) return <LockIcon color="secondary" fontSize="large" />;
    return <AssignmentIcon color="primary" fontSize="large" />;
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            לוח משימות סגירה
          </Typography>
          <Typography variant="body1" color="text.secondary">
            לוח הודעות מרכזי להגדרת משימות הסגירה של הסלון (זבל, אורות, מזגנים) עבור המתנדבים בסוף כל משמרת
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchTasks} disabled={loading}>
            רענן
          </Button>
          {isManager && (
            <Button variant="contained" startIcon={<AddTaskIcon />} onClick={handleOpenAdd}>
              הוסף משימה
            </Button>
          )}
        </Box>
      </Box>

      {isManager && (
        <Paper sx={{ p: 2, mb: 4, bgcolor: 'background.paper', borderRadius: 2, border: '1px dashed #ccc' }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            משימות נפוצות להוספה מהירה בלחיצה אחת:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Chip
              icon={<DeleteSweepIcon />}
              label="ריקון פחים והוצאת זבל"
              onClick={() => addPreset('ריקון פחים והוצאת זבל', 'לרוקן את כל הפחים בסלון ולהוציא לפח הצפרדע בחוץ')}
              clickable
              color="primary"
              variant="outlined"
            />
            <Chip
              icon={<AcUnitIcon />}
              label="כיבוי כל המזגנים"
              onClick={() => addPreset('כיבוי כל המזגנים', 'לבדוק בחדר הראשי ובחדרי השירות שהמזגנים כבויים')}
              clickable
              color="info"
              variant="outlined"
            />
            <Chip
              icon={<LightbulbIcon />}
              label="כיבוי אורות ושלטי תאורה"
              onClick={() => addPreset('כיבוי אורות ושלטי תאורה', 'לוודא כיבוי מלא של תאורת פנים ושלטים חיצוניים')}
              clickable
              color="warning"
              variant="outlined"
            />
            <Chip
              icon={<LockIcon />}
              label="נעילת דלתות וחלונות"
              onClick={() => addPreset('נעילת דלתות וחלונות', 'לוודא שכל החלונות סגורים והדלת הראשית נעולה במפתח')}
              clickable
              color="secondary"
              variant="outlined"
            />
          </Box>
        </Paper>
      )}

      <Grid container spacing={3}>
        {tasks.map((task, idx) => (
          <Grid item xs={12} sm={6} md={4} key={task.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 2,
                boxShadow: 2,
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ p: 1, bgcolor: 'grey.100', borderRadius: 2 }}>
                    {getTaskIcon(task.title)}
                  </Box>
                  <Chip label={`משימה #${task.order_index || idx + 1}`} size="small" />
                </Box>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  {task.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {task.description || 'ללא פירוט נוסף'}
                </Typography>
              </CardContent>
              {isManager && (
                <>
                  <Divider />
                  <CardActions sx={{ justifyContent: 'flex-end', px: 2 }}>
                    <Tooltip title="ערוך משימה">
                      <IconButton size="small" color="primary" onClick={() => handleOpenEdit(task)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="מחק משימה">
                      <IconButton size="small" color="error" onClick={() => handleDelete(task)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </>
              )}
            </Card>
          </Grid>
        ))}

        {tasks.length === 0 && !loading && (
          <Grid item xs={12}>
            <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6">אין משימות סגירה בלוח</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                לחץ על כפתור "הוסף משימה" או בחר מתוך התבניות המהירות למעלה
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSave}>
          <DialogTitle fontWeight="bold">
            {isEditing ? 'עריכת משימת סגירה' : 'הוספת משימת סגירה חדשה'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="שם המשימה (כותרת)"
                required
                fullWidth
                placeholder="למשל: כיבוי מזגנים ואורות"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              />
              <TextField
                label="הוראות ופירוט"
                multiline
                rows={3}
                fullWidth
                placeholder="הסבר למתנדב מה נדרש לבדוק בדיוק לפני נעילת הסלון..."
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              />
              <TextField
                label="סדר הופעה בלוח"
                type="number"
                fullWidth
                value={taskForm.order_index}
                onChange={(e) => setTaskForm({ ...taskForm, order_index: e.target.value })}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>ביטול</Button>
            <Button type="submit" variant="contained">
              {isEditing ? 'שמור שינויים' : 'הוסף משימה'}
            </Button>
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

export default TaskManagement;
