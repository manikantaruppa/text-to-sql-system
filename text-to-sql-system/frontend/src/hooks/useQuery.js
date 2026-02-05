import { useState, useContext } from 'react';
import { processQuery } from '../services/api';
import { AppContext } from '../contexts/AppContext';

const useQuery = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [queryHistory, setQueryHistory] = useState([]);
  const { currentTable, setIsLoading, setError, showNotification } = useContext(AppContext);

  // Handle query change
  const handleQueryChange = (value) => {
    setQuery(value);
  };

  // Handle query submission
  const handleSubmitQuery = async () => {
    if (!query.trim()) {
      showNotification('Please enter a query', 'warning');
      return;
    }

    if (!currentTable) {
      showNotification('No table selected. Please upload a file first.', 'warning');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await processQuery(query, currentTable);
      
      // Store the results
      setResults(response);
      
      // Add to query history
      setQueryHistory(prev => [
        {
          id: Date.now(),
          query,
          table: currentTable,
          timestamp: new Date().toISOString()
        },
        ...prev.slice(0, 9) // Keep only the 10 most recent queries
      ]);

      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Error processing query';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Run a query from history
  const runHistoryQuery = (historyItem) => {
    setQuery(historyItem.query);
    // Don't auto-submit to give user a chance to modify
  };

  // Clear query results
  const clearResults = () => {
    setResults(null);
  };

  return {
    query,
    results,
    queryHistory,
    handleQueryChange,
    handleSubmitQuery,
    runHistoryQuery,
    clearResults
  };
};

export default useQuery;