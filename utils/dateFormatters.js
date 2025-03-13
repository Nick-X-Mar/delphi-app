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
    // Parse the timestamp as UTC
    const date = new Date(datetime);
    
    // Format using toLocaleString with explicit UTC timezone handling
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Europe/Athens' // Use Athens timezone (UTC+2/UTC+3)
    });
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