import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(response => response, error => {
  if (error.response && error.response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
  return Promise.reject(error);
});

export const login = (phone, password) => api.post('/auth/login', { phone, password });
export const getShifts = (month, year) => api.get(`/shifts?month=${month}&year=${year}`);
export const generateShifts = (month, year) => api.post('/shifts/generate', { month, year });
export const createShift = (data) => api.post('/shifts', data);
export const updateShift = (shiftId, data) => api.patch(`/shifts/${shiftId}`, data);
export const customShiftSignup = (data) => api.post('/shifts/custom-signup', data);
export const assignShift = (shiftId, userId = null, notes = null) => api.post('/shifts/assign', { shift_id: shiftId, user_id: userId, notes });
export const unassignShift = (assignmentId) => api.delete(`/shifts/assign/${assignmentId}`);
export const deleteShift = (shiftId) => api.delete(`/shifts/${shiftId}`);
export const batchDeleteShifts = (shiftIds) => api.post('/shifts/batch-delete', { shift_ids: shiftIds });
export const deleteWeekendShifts = (month, year) => api.post(`/shifts/delete-weekends?month=${month}&year=${year}`);
export const batchUnassignShifts = (shiftIds) => api.post('/shifts/batch-unassign', { shift_ids: shiftIds });
export const clockIn = (shiftId) => api.post('/shifts/clock-in', { shift_id: shiftId });
export const clockOut = (shiftId) => api.post('/shifts/clock-out', { shift_id: shiftId });

export const getNotifications = () => api.get('/notifications');
export const markRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllRead = () => api.put('/notifications/read-all');
export const getVolunteerStats = (year) => api.get('/reports/volunteer/stats' + (year ? `?year=${year}` : ''));
export const getVolunteerAttendanceReport = (year) => api.get('/reports/volunteer/attendance' + (year ? `?year=${year}` : ''));
export const getAdminStats = (month, year) => api.get(`/reports/admin/stats?month=${month}&year=${year}`);
export const downloadVolunteerPdf = (year) => api.get('/reports/volunteer/pdf' + (year ? `?year=${year}` : ''), { responseType: 'blob' });
export const downloadAdminPdf = (month, year) => api.get(`/reports/admin/pdf?month=${month}&year=${year}`, { responseType: 'blob' });
export const getAllUsersYearlyStats = (year) => api.get('/reports/admin/yearly-stats' + (year ? `?year=${year}` : ''));
export const downloadAdminVolunteerPdf = (userId, year) => api.get(`/reports/admin/volunteer/${userId}/pdf` + (year ? `?year=${year}` : ''), { responseType: 'blob' });
export const getChecklist = () => api.get('/checklist');
export const createChecklistTask = (data) => api.post('/checklist', data);
export const updateChecklistTask = (taskId, data) => api.put(`/checklist/${taskId}`, data);
export const deleteChecklistTask = (taskId) => api.delete(`/checklist/${taskId}`);
export const completeTask = (taskId, assignmentId, notes = '') => api.post('/checklist/complete', { task_id: taskId, assignment_id: assignmentId, notes });
export const getShiftCompletions = (assignmentId) => api.get(`/checklist/shift/${assignmentId}`);
export const getUsers = () => api.get('/users');
export const createUser = (data) => api.post('/users', data);
export const resetPassword = (userId, password) => api.put(`/users/${userId}/reset-password`, { password });
export const deactivateUser = (userId) => api.delete(`/users/${userId}`);
export const hardDeleteUser = (userId) => api.delete(`/users/${userId}/hard`);

export default api;

