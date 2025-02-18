import { format, parseISO } from 'date-fns';

export const formatDate = (date) => {
  if (!date) return '-';
  try {
    return format(parseISO(date), 'dd/MM/yyyy');
  } catch (error) {
    console.error('Date parsing error:', error);
    return '-';
  }
};

export const formatDateTime = (datetime) => {
  if (!datetime) return '-';
  try {
    return format(parseISO(datetime), 'dd/MM/yyyy HH:mm');
  } catch (error) {
    console.error('DateTime parsing error:', error);
    return '-';
  }
};

// Format a Date object to YYYY-MM-DD for API calls
export const formatDateForAPI = (date) => {
  if (!date || !(date instanceof Date)) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}; 