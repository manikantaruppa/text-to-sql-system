import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// File upload API
export const uploadFile = async (file, tableName) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('table_name', tableName);

  try {
    const response = await api.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

// Query processing API
export const processQuery = async (query, tableName) => {
  try {
    const response = await api.post('/api/query', {
      query,
      table_name: tableName,
    });
    return response.data;
  } catch (error) {
    console.error('Error processing query:', error);
    throw error;
  }
};

// Get available tables
export const getTables = async () => {
  try {
    const response = await api.get('/api/tables');
    return response.data.tables;
  } catch (error) {
    console.error('Error fetching tables:', error);
    throw error;
  }
};

// Health check API
export const checkHealth = async () => {
  try {
    const response = await api.get('/api/health');
    return response.data;
  } catch (error) {
    console.error('Error checking health:', error);
    throw error;
  }
};

export default {
  uploadFile,
  processQuery,
  getTables,
  checkHealth,
};