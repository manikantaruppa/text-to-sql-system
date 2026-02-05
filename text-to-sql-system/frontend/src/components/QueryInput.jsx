import React, { useState, useContext } from 'react';
import { MagnifyingGlassIcon, ClockIcon } from '@heroicons/react/24/outline';
import { AppContext } from '../contexts/AppContext';
import useQuery from '../hooks/useQuery';

const QueryInput = ({ onQueryResults }) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const { currentTable, availableTables, setCurrentTable } = useContext(AppContext);
  const {
    query,
    queryHistory,
    handleQueryChange,
    handleSubmitQuery,
    runHistoryQuery
  } = useQuery();

  // Example queries based on common patterns
  const exampleQueries = [
    "What's the total sales by region?",
    "Show me the average age by gender",
    "Which products had the highest revenue last month?",
    "Compare customer satisfaction scores across different stores"
  ];

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    const results = await handleSubmitQuery();
    if (results) {
      onQueryResults(results);
    }
  };

  // Handle example query click
  const handleExampleClick = (exampleQuery) => {
    handleQueryChange(exampleQuery);
  };

  // Handle history item click
  const handleHistoryClick = (historyItem) => {
    runHistoryQuery(historyItem);
    setIsHistoryOpen(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-card p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-gray-800">Ask a Question</h2>
        
        {/* Table Selector */}
        {availableTables && availableTables.length > 0 && (
          <div className="flex items-center">
            <label htmlFor="table-select" className="block text-sm font-medium text-gray-700 mr-2">
              Data Source:
            </label>
            <select
              id="table-select"
              value={currentTable}
              onChange={(e) => setCurrentTable(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            >
              {availableTables.map((table) => (
                <option key={table} value={table}>
                  {table}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4 relative">
          <textarea
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Ask anything about your data in plain English (e.g., 'What's the average sales by region?')"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            rows={4}
          />
          
          {/* Query History Button */}
          {queryHistory.length > 0 && (
            <button
              type="button"
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 text-gray-500"
              title="Query History"
            >
              <ClockIcon className="w-5 h-5" />
            </button>
          )}
          
          {/* Query History Dropdown */}
          {isHistoryOpen && queryHistory.length > 0 && (
            <div className="absolute top-full right-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
              <div className="p-2 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-700">Recent Queries</h3>
              </div>
              <ul className="py-1">
                {queryHistory.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleHistoryClick(item)}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 truncate"
                    >
                      <span className="font-medium">{item.query}</span>
                      <span className="block text-xs text-gray-500">
                        Table: {item.table} • {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {/* Submit Button */}
        <button
          type="submit"
          className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
        >
          <MagnifyingGlassIcon className="w-5 h-5 mr-2" />
          Submit Query
        </button>
      </form>
      
      {/* Example Queries */}
      <div className="mt-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Try these example queries:</h3>
        <div className="flex flex-wrap gap-2">
          {exampleQueries.map((example, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleExampleClick(example)}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QueryInput;