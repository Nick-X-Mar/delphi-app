'use client';

import { useState, useEffect } from 'react';
import { StarIcon as StarOutline } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';

export function StarRating({ value, onChange, disabled = false }) {
  const [rating, setRating] = useState(value || 0);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    setRating(value || 0);
  }, [value]);

  const handleMouseMove = (e, index) => {
    if (disabled) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const x = e.clientX - rect.left;
    
    // If mouse is on the left half of the star
    if (x < width / 2) {
      setHoverRating(index + 0.5);
    } else {
      setHoverRating(index + 1);
    }
  };

  const handleMouseLeave = () => {
    setHoverRating(0);
  };

  const handleClick = (rating) => {
    if (disabled) return;
    setRating(rating);
    onChange(rating);
  };

  const renderStar = (index) => {
    const displayRating = hoverRating || rating;
    const isHalfStar = displayRating - index === 0.5;
    const isFullStar = displayRating - index >= 1;

    return (
      <div
        key={index}
        className={`relative inline-block cursor-${disabled ? 'default' : 'pointer'}`}
        onMouseMove={disabled ? undefined : (e) => handleMouseMove(e, index)}
        onClick={disabled ? undefined : () => handleClick(hoverRating)}
      >
        {/* Background star (outline) */}
        <StarOutline className="h-8 w-8 text-gray-300" />
        
        {/* Overlay star (filled) with clip path for half stars */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: isHalfStar ? 'inset(0 50% 0 0)' : 'inset(0)',
            display: (isHalfStar || isFullStar) ? 'block' : 'none'
          }}
        >
          <StarIcon className="h-8 w-8 text-yellow-400" />
        </div>
      </div>
    );
  };

  return (
    <div 
      className="flex space-x-1" 
      onMouseLeave={disabled ? undefined : handleMouseLeave}
    >
      {[...Array(5)].map((_, index) => renderStar(index))}
      <input
        type="hidden"
        name="stars"
        value={rating}
        required
      />
    </div>
  );
} 