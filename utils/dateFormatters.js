const isPlainDateString = (str) => typeof str === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(str);

export const formatDate = (date) => {
  if (!date) return '-';
  try {
    if (isPlainDateString(date)) {
      const [year, month, day] = date.split('-');
      return `${day}/${month}/${year}`;
    }
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
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

export const toDateInputValue = (date) => {
  if (!date) return '';
  if (isPlainDateString(date)) {
    return date;
  }
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Format a Date object to YYYY-MM-DD for API calls
export const formatDateForAPI = (date) => {
  if (!date || !(date instanceof Date)) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateToUTCMs = (date) => {
  if (isPlainDateString(date)) {
    const [year, month, day] = date.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  }
  const d = new Date(date);
  if (isNaN(d.getTime())) return NaN;
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
};

export const calculateNights = (checkinDate, checkoutDate) => {
  if (!checkinDate || !checkoutDate) return null;
  try {
    const checkinMs = parseDateToUTCMs(checkinDate);
    const checkoutMs = parseDateToUTCMs(checkoutDate);
    
    if (isNaN(checkinMs) || isNaN(checkoutMs)) {
      return null;
    }
    
    const nights = Math.round((checkoutMs - checkinMs) / (1000 * 60 * 60 * 24));
    
    return nights >= 0 ? nights : null;
  } catch (error) {
    console.error('Error calculating nights:', error);
    return null;
  }
}; 