import React, { useState } from 'react';
import {
  DocumentTextIcon,
  TableCellsIcon,
  CodeBracketIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';
import DataVisualization from './DataVisualization';

const ResultsDisplay = ({ results, onNewQuery }) => {
  const [activeTab, setActiveTab] = useState('explanation');
  
  if (!results) return null;
  
  const {
    natural_language_response,
    sql_query,
    data,
    explanation,
    visualization_type
  } = results;
  
  // Handle copying SQL to clipboard
  const handleCopySQL = () => {
    navigator.clipboard.writeText(sql_query);
    // Could add a notification here
  };
  
  // Format the SQL query for display
  const formatSQL = (sql) => {
    // Very basic SQL formatting
    return sql
      .replace(/SELECT/gi, 'SELECT')
      .replace(/FROM/gi, '\nFROM')
      .replace(/WHERE/gi, '\nWHERE')
      .replace(/GROUP BY/gi, '\nGROUP BY')
      .replace(/ORDER BY/gi, '\nORDER BY')
      .replace(/HAVING/gi, '\nHAVING')
      .replace(/LIMIT/gi, '\nLIMIT')
      .replace(/JOIN/gi, '\nJOIN')
      .replace(/AND/gi, '\n  AND')
      .replace(/OR/gi, '\n  OR');
  };
  
  return (
    <div className="bg-white rounded-lg shadow-card overflow-hidden animate-fade-in">
      {/* Header with tabs */}
      <div className="border-b border-gray-200">
        <div className="px-6 py-4">
          <h2 className="text-2xl font-semibold text-gray-800">Results & Analysis</h2>
        </div>
        <div className="px-6 flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('explanation')}
            className={`px-4 py-3 text-sm font-medium border-b-2 focus:outline-none ${
              activeTab === 'explanation'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <DocumentTextIcon className="w-5 h-5 inline mr-2" />
            Explanation
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`px-4 py-3 ml-8 text-sm font-medium border-b-2 focus:outline-none ${
              activeTab === 'data'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <TableCellsIcon className="w-5 h-5 inline mr-2" />
            Data
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`px-4 py-3 ml-8 text-sm font-medium border-b-2 focus:outline-none ${
              activeTab === 'sql'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <CodeBracketIcon className="w-5 h-5 inline mr-2" />
            SQL Query
          </button>
        </div>
      </div>
      
      {/* Tab content */}
      <div className="p-6">
        {activeTab === 'explanation' && (
          <div className="space-y-6">
            {/* Natural language response */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">Response</h3>
              <div className="bg-gray-50 rounded-lg p-4 text-gray-800">
                {natural_language_response}
              </div>
            </div>
            
            {/* Visualization */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">Visualization</h3>
              <DataVisualization 
                data={data} 
                type={visualization_type} 
              />
            </div>
            
            {/* Detailed explanation */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">Detailed Analysis</h3>
              <div 
                className="prose prose-blue max-w-none bg-gray-50 rounded-lg p-4"
                dangerouslySetInnerHTML={{ __html: explanation }}
              />
            </div>
          </div>
        )}
        
        {activeTab === 'data' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-800">Raw Data</h3>
              <span className="text-sm text-gray-500">
                {data.length} {data.length === 1 ? 'row' : 'rows'} returned
              </span>
            </div>
            
            <div className="overflow-x-auto bg-gray-50 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    {data.length > 0 && Object.keys(data[0]).map((key) => (
                      <th
                        key={key}
                        className="px-6 py-3 bg-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {key.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.map((row, rowIndex) => (
                    <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {Object.values(row).map((value, cellIndex) => (
                        <td
                          key={`${rowIndex}-${cellIndex}`}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        >
                          {value !== null ? String(value) : 'NULL'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {activeTab === 'sql' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-800">Generated SQL Query</h3>
              <button
                onClick={handleCopySQL}
                className="inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <DocumentDuplicateIcon className="w-4 h-4 mr-1" />
                Copy SQL
              </button>
            </div>
            
            <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <code>{formatSQL(sql_query)}</code>
            </pre>
            
            <div className="mt-6 text-sm text-gray-500">
              <p>This SQL query was automatically generated from your natural language question.</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
        <button
          onClick={onNewQuery}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <ArrowPathIcon className="w-4 h-4 mr-2" />
          Ask Another Question
        </button>
      </div>
    </div>
  );
};

export default ResultsDisplay;