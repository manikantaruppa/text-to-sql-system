import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white mt-auto">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="border-t border-gray-200 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-500 mb-4 md:mb-0">
              © {currentYear} NaturalSQL. All rights reserved.
            </div>
            
            <div className="flex space-x-6">
              <a
                href="#"
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                About
              </a>
              <a
                href="#"
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                Documentation
              </a>
              <a
                href="#"
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                Privacy
              </a>
              <a
                href="#"
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                Terms
              </a>
            </div>
          </div>
          
          <div className="mt-6 text-center text-xs text-gray-400">
            <p>This is an open-source project. Not for commercial use.</p>
            <p className="mt-1">Powered by FastAPI, React, and Large Language Models.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;