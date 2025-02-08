import hotelConfig from '@/config/hotels.json';

export const getHotelCategories = () => hotelConfig.categories;

export const getHotelCategoryColor = (category) => {
  const categoryConfig = hotelConfig.categories.find(c => c.value === category);
  
  if (!categoryConfig) {
    return 'bg-gray-100 text-gray-800'; // default color if category not found
  }

  const { color } = categoryConfig;
  return `bg-${color.bg}-${color.intensity.bg} text-${color.text}-${color.intensity.text}`;
};

export const isValidHotelCategory = (category) => {
  return hotelConfig.categories.some(c => c.value === category);
};

export const getHotelCategoryValues = () => {
  return hotelConfig.categories.map(c => c.value);
};

// New utility function to get individual color properties
export const getHotelCategoryColorProps = (category) => {
  const categoryConfig = hotelConfig.categories.find(c => c.value === category);
  
  if (!categoryConfig) {
    return {
      bg: 'bg-gray-100',
      text: 'text-gray-800'
    };
  }

  const { color } = categoryConfig;
  return {
    bg: `bg-${color.bg}-${color.intensity.bg}`,
    text: `text-${color.text}-${color.intensity.text}`
  };
}; 