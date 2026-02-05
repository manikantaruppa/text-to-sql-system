import React from 'react';

const LoadingSpinner = ({ message = 'Processing your request...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 animate-fade-in">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-gray-200 border-solid rounded-full"></div>
        <div className="absolute top-0 w-16 h-16 border-4 border-primary-500 border-solid rounded-full border-t-transparent animate-spin"></div>
      </div>
      <p className="mt-4 text-gray-600 text-center">{message}</p>
    </div>
  );
};

export default LoadingSpinner;