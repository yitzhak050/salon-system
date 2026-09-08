import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export const formatHebrewDate = (date) => {
  if (!date) return '';
  return format(new Date(date), 'EEEE, d בMMMM yyyy', { locale: he });
};

export const getDaysInMonth = (month, year) => {
  const date = new Date(year, month - 1, 1);
  const days = [];
  while (date.getMonth() === month - 1) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

export const shiftSlotLabel = (slot) => {
  switch (slot) {
    case 'MORNING': return 'בוקר (10:00-14:00)';
    case 'AFTERNOON': return 'צהריים (14:00-18:00)';
    case 'EVENING': return 'ערב (18:00-22:00)';
    default: return slot;
  }
};

export const shiftSlotShortLabel = (slot) => {
  switch (slot) {
    case 'MORNING': return 'בוקר';
    case 'AFTERNOON': return 'צהריים';
    case 'EVENING': return 'ערב';
    default: return slot;
  }
};


export const shiftSlotColor = (slot) => {
  switch (slot) {
    case 'MORNING': return '#FFB300';
    case 'AFTERNOON': return '#1976D2';
    case 'EVENING': return '#7B1FA2';
    default: return '#757575';
  }
};
