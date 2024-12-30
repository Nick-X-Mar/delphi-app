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