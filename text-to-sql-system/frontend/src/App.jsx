import React, { useState, useContext, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import FileUpload from './components/FileUpload';
import QueryInput from './components/QueryInput';
import ResultsDisplay from './components/ResultsDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import { AppProvider, AppContext } from './contexts/AppContext';
import { checkHealth } from './services/api';

// This is the main App container component
const AppContainer = () => {
  const { 
    isFileUploaded, 
    isLoading, 
    error, 
    notification,
    showNotification
  } = useContext(AppContext);
  
  const [queryResults, setQueryResults] = useState(null);
  const [isApiAvailable, setIsApiAvailable] = useState(true);
  
  // Check API health on component mount
  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        await checkHealth();
        setIsApiAvailable(true);
      } catch (error) {
        setIsApiAvailable(false);
        showNotification('Backend API is not available. Please check server status.', 'error');
      }
    };
    
    checkApiHealth();
    // Check API health every 30 seconds
    const intervalId = setInterval(checkApiHealth, 30000);
    
    return () => clearInterval(intervalId);
  }, [showNotification]);
  
  // Handler for when a query is executed successfully
  const handleQueryResults = (results) => {
    setQueryResults(results);
  };
  
  // Handler for clearing query results to start a new query
  const handleNewQuery = () => {
    setQueryResults(null);
  };
  
  // Render API unavailable message
  if (!isApiAvailable) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto bg-red-50 p-6 rounded-lg border border-red-200">
            <h2 className="text-xl font-bold text-red-700 mb-4">Backend API Unavailable</h2>
            <p className="mb-4">
              The backend API is currently unavailable. This could be due to:
            </p>
            <ul className="list-disc ml-6 mb-4 text-red-700">
              <li>The server is not running</li>
              <li>Network connectivity issues</li>
              <li>Server is still starting up</li>
            </ul>
            <p className="mb-4">
              Please ensure the backend server is running at <code className="bg-red-100 px-2 py-1 rounded">{process.env.REACT_APP_API_URL || 'http://localhost:8000'}</code>
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry Connection
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Show notification if present */}
        {notification.message && (
          <div className={`notification notification-${notification.type}`}>
            {notification.message}
          </div>
        )}

        {/* Show error if present */}
        {error && (
          <div className="max-w-3xl mx-auto mb-6 bg-red-50 p-4 rounded-lg border border-red-300 text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="max-w-3xl mx-auto">
            {!isFileUploaded ? (
              <FileUpload />
            ) : queryResults ? (
              <ResultsDisplay 
                results={queryResults} 
                onNewQuery={handleNewQuery} 
              />
            ) : (
              <QueryInput onQueryResults={handleQueryResults} />
            )}
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

// Wrapper with ErrorBoundary and AppProvider
const App = () => {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContainer />
      </AppProvider>
    </ErrorBoundary>
  );
};

export default App;