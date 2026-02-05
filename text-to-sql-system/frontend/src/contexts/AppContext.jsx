import React, { createContext, useState, useEffect } from 'react';
import { getTables } from '../services/api';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [isFileUploaded, setIsFileUploaded] = useState(false);
  const [currentTable, setCurrentTable] = useState('');
  const [availableTables, setAvailableTables] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState({ message: '', type: '' });

  // Fetch available tables on component mount
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const tables = await getTables();
        setAvailableTables(tables);
        
        // If there are tables available, set the first one as current
        if (tables && tables.length > 0) {
          setCurrentTable(tables[0]);
          setIsFileUploaded(true);
        }
      } catch (error) {
        // Ignore error on initial load - tables might not exist yet
        console.log('No tables found initially');
      }
    };

    fetchTables();
  }, []);

  // Function to show a notification
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    
    // Auto-hide notification after 5 seconds
    setTimeout(() => {
      setNotification({ message: '', type: '' });
    }, 5000);
  };

  // Function to refresh available tables
  const refreshTables = async () => {
    try {
      const tables = await getTables();
      setAvailableTables(tables);
      return tables;
    } catch (error) {
      setError('Error fetching tables');
      return [];
    }
  };

  // Value object to be provided to consumers
  const value = {
    isFileUploaded,
    setIsFileUploaded,
    currentTable,
    setCurrentTable,
    availableTables,
    setAvailableTables,
    refreshTables,
    isLoading,
    setIsLoading,
    error,
    setError,
    notification,
    showNotification
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};