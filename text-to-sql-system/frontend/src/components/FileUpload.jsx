import React, { useState, useRef } from 'react';
import { DocumentArrowUpIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import useFileUpload from '../hooks/useFileUpload';

const FileUpload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const {
    file,
    tableName,
    uploadProgress,
    handleFileChange,
    handleTableNameChange,
    handleUpload,
  } = useFileUpload();

  // Handle drag events
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileChange(e.target.files[0]);
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    handleUpload();
  };

  return (
    <div className="bg-white rounded-lg shadow-card p-6 animate-fade-in">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Upload Data</h2>
      
      <form onSubmit={handleSubmit}>
        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center transition-colors cursor-pointer
            ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept=".csv"
            className="hidden"
          />
          
          <DocumentArrowUpIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          
          <p className="text-gray-600 mb-2">
            Drag and drop your CSV file here, or <span className="text-primary-600 font-medium">click to browse</span>
          </p>
          
          <p className="text-sm text-gray-500">
            Supported format: CSV
          </p>
          
          {file && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-left">
              <p className="font-medium text-gray-700">Selected file:</p>
              <p className="text-gray-600 truncate">{file.name}</p>
              <p className="text-gray-500 text-sm">
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
          )}
        </div>
        
        {/* Table Name Input */}
        {file && (
          <div className="mb-6">
            <label htmlFor="table-name" className="block text-sm font-medium text-gray-700 mb-1">
              Table Name
            </label>
            <input
              type="text"
              id="table-name"
              value={tableName}
              onChange={(e) => handleTableNameChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter a name for your table (letters, numbers, underscores only)"
            />
            <p className="mt-1 text-sm text-gray-500">
              This will be used as the table name in the database.
            </p>
          </div>
        )}
        
        {/* Upload Progress */}
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-1">Uploading...</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="mt-1 text-xs text-gray-500 text-right">{uploadProgress}%</p>
          </div>
        )}
        
        {/* Upload Button */}
        {file && (
          <button
            type="submit"
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          >
            <ArrowUpTrayIcon className="w-5 h-5 mr-2" />
            Upload and Process
          </button>
        )}
      </form>
      
      {/* Tips Section */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Tips for best results:</h3>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>Make sure your CSV file has a header row</li>
          <li>Ensure data types are consistent within columns</li>
          <li>Avoid complex formatting or merged cells</li>
          <li>Keep file size under 100MB for best performance</li>
        </ul>
      </div>
    </div>
  );
};

export default FileUpload;