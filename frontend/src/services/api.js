import axios from 'axios';

// In production, VITE_API_BASE_URL points to the real backend URL.
// In dev (Docker), the Vite proxy rewrites /api → http://backend:8000.
const baseURL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '')
  : '/api';

const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60; // 2,592,000 seconds (30 days)

export function getCookieToken() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)salon_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function getStoredToken() {
  const local = localStorage.getItem('token');
  if (local) return local;
  const cookieToken = getCookieToken();
  if (cookieToken) {
    localStorage.setItem('token', cookieToken);
    return cookieToken;
  }
  return null;
}

export function saveAuthToken(token, rememberForMonth = true) {
  localStorage.setItem('token', token);
  if (typeof document !== 'undefined') {
    if (rememberForMonth) {
      document.cookie = `salon_token=${encodeURIComponent(token)}; max-age=${THIRTY_DAYS_SECONDS}; path=/; SameSite=Lax`;
    } else {
      document.cookie = `salon_token=${encodeURIComponent(token)}; path=/; SameSite=Lax`;
    }
  }
}

export function clearAuthToken() {
  localStorage.removeItem('token');
  if (typeof document !== 'undefined') {
    document.cookie = 'salon_token=; max-age=0; path=/; SameSite=Lax';
  }
}

const api = axios.create({
  baseURL,
});

api.interceptors.request.use(config => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(response => response, error => {
  if (error.response && error.response.status === 401) {
    clearAuthToken();
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
export const updateAssignment = (assignmentId, data) => api.patch(`/shifts/assign/${assignmentId}`, data);
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
export const getVolunteerAttendanceReport = (year = null, filterType = null) => {
  const params = [];
  if (year) params.push(`year=${year}`);
  if (filterType) params.push(`filter_type=${filterType}`);
  const q = params.length > 0 ? `?${params.join('&')}` : '';
  return api.get(`/reports/volunteer/attendance${q}`);
};
export const getAdminStats = (month, year) => api.get(`/reports/admin/stats?month=${month}&year=${year}`);
export const downloadVolunteerPdf = (year = null, filterType = null) => {
  const params = [];
  if (year) params.push(`year=${year}`);
  if (filterType) params.push(`filter_type=${filterType}`);
  const q = params.length > 0 ? `?${params.join('&')}` : '';
  return api.get(`/reports/volunteer/pdf${q}`, { responseType: 'blob' });
};
export const downloadAdminPdf = (month, year) => api.get(`/reports/admin/pdf?month=${month}&year=${year}`, { responseType: 'blob' });
export const getAllUsersYearlyStats = (year) => api.get('/reports/admin/yearly-stats' + (year ? `?year=${year}` : ''));
export const getAdminVolunteerAttendanceReport = (userId, year = null, filterType = null) => {
  const params = [];
  if (year) params.push(`year=${year}`);
  if (filterType) params.push(`filter_type=${filterType}`);
  const q = params.length > 0 ? `?${params.join('&')}` : '';
  return api.get(`/reports/admin/volunteer/${userId}/attendance${q}`);
};
export const downloadAdminVolunteerPdf = (userId, year = null, filterType = null) => {
  const params = [];
  if (year) params.push(`year=${year}`);
  if (filterType) params.push(`filter_type=${filterType}`);
  const q = params.length > 0 ? `?${params.join('&')}` : '';
  return api.get(`/reports/admin/volunteer/${userId}/pdf${q}`, { responseType: 'blob' });
};
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
export const hardDeleteUser = (userId, force = false) => api.delete(`/users/${userId}/hard${force ? '?force=true' : ''}`);

// פרופיל אישי וייבוא משתמשים מאקסל
export const getMyProfile = () => api.get('/users/me');
export const updateMyProfile = (data) => api.put('/users/me/profile', data);
export const verifyMyPassword = (oldPassword) => api.post('/users/me/verify-password', { old_password: oldPassword });
export const changeMyPassword = (oldPassword, newPassword) =>
  api.put('/users/me/change-password', { old_password: oldPassword, new_password: newPassword });
export const bulkImportUsers = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/users/bulk-import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const downloadUsersExcelTemplate = () =>
  api.get('/users/excel-template', { responseType: 'blob' });

// הגדרות אתר ולוח מודעות
export const getPublicSettings = () => api.get('/settings/public');
export const updateSettings = (settingsData) => api.put('/settings', { settings: settingsData });

export default api;
