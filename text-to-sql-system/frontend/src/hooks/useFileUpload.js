import { useState, useContext } from 'react';
import { uploadFile } from '../services/api';
import { AppContext } from '../contexts/AppContext';

const useFileUpload = () => {
  const [file, setFile] = useState(null);
  const [tableName, setTableName] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const { 
    setIsFileUploaded, 
    setCurrentTable, 
    setIsLoading, 
    setError, 
    refreshTables,
    showNotification
  } = useContext(AppContext);

  // Handle file selection
  const handleFileChange = (selectedFile) => {
    if (selectedFile) {
      setFile(selectedFile);
      
      // Generate a default table name from the file name
      const fileName = selectedFile.name.split('.')[0];
      const sanitizedName = fileName
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      
      setTableName(sanitizedName);
    }
  };

  // Handle table name change
  const handleTableNameChange = (name) => {
    // Sanitize the table name to ensure it's SQL-safe
    const sanitizedName = name
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
    
    setTableName(sanitizedName);
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!file) {
      showNotification('Please select a file first', 'error');
      return;
    }

    if (!tableName) {
      showNotification('Please provide a table name', 'error');
      return;
    }

    setIsLoading(true);
    setError('');
    setUploadProgress(0);

    try {
      // Create interval to simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      // Upload the file
      const response = await uploadFile(file, tableName);
      
      // Clear interval and set progress to 100%
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Update app state
      setIsFileUploaded(true);
      setCurrentTable(tableName);
      
      // Refresh the tables list
      await refreshTables();
      
      // Show success notification
      showNotification('File uploaded successfully!', 'success');
      
      // Reset local state
      setFile(null);
      setTableName('');
      setUploadProgress(0);
      
      return response;
    } catch (error) {
      setError(error.response?.data?.detail || 'Error uploading file');
      showNotification(error.response?.data?.detail || 'Error uploading file', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    file,
    tableName,
    uploadProgress,
    handleFileChange,
    handleTableNameChange,
    handleUpload,
  };
};

export default useFileUpload;