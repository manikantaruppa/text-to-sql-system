/**
 * Format a date string in a human-readable format
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date string
 */
export const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };
  
  /**
   * Truncate a string if it exceeds a maximum length
   * @param {string} str - The string to truncate
   * @param {number} maxLength - Maximum length before truncation
   * @returns {string} - Truncated string with ellipsis or original string
   */
  export const truncateString = (str, maxLength = 50) => {
    if (!str) return '';
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
  };
  
  /**
   * Create a sanitized table name from a file name
   * @param {string} fileName - Original file name
   * @returns {string} - Sanitized table name
   */
  export const createTableName = (fileName) => {
    if (!fileName) return '';
    
    // Remove file extension
    const nameWithoutExt = fileName.split('.')[0];
    
    // Replace spaces with underscores and remove special characters
    return nameWithoutExt
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  };
  
  /**
   * Generate a readable file size string
   * @param {number} bytes - Size in bytes
   * @returns {string} - Formatted size string (e.g., "2.5 MB")
   */
  export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  /**
   * Format SQL query with basic syntax highlighting
   * @param {string} sql - Raw SQL query
   * @returns {string} - Formatted SQL query
   */
  export const formatSQLQuery = (sql) => {
    if (!sql) return '';
    
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
  
  /**
   * Detect the most appropriate visualization type for a dataset
   * @param {Array} data - Dataset to analyze
   * @returns {string} - Suggested visualization type ('bar', 'line', 'pie', or 'table')
   */
  export const suggestVisualizationType = (data) => {
    if (!data || data.length === 0) return 'table';
    
    // Get column names
    const columns = Object.keys(data[0]);
    
    // If only two columns (likely category and value), pie chart is good
    if (columns.length === 2) {
      // Check if second column is numeric (for pie chart)
      const values = data.map(row => row[columns[1]]);
      const allNumeric = values.every(val => !isNaN(Number(val)));
      
      if (allNumeric && data.length <= 10) {
        return 'pie';
      }
    }
    
    // Check if first column might be a date (for line chart)
    const firstColValues = data.map(row => row[columns[0]]);
    const potentialDates = firstColValues.filter(val => !isNaN(Date.parse(val)));
    
    if (potentialDates.length === firstColValues.length) {
      return 'line'; // First column contains dates, suggest line chart
    }
    
    // Default to bar chart for categorical data with numeric values
    if (columns.length >= 2) {
      // Check if remaining columns are numeric
      const hasNumericColumns = columns.slice(1).some(col => {
        const values = data.map(row => row[col]);
        return values.every(val => !isNaN(Number(val)));
      });
      
      if (hasNumericColumns) {
        return data.length > 15 ? 'line' : 'bar';
      }
    }
    
    // Default to table for complex data
    return 'table';
  };
  
  /**
   * Create a friendly message based on query results
   * @param {Object} results - Query results
   * @returns {string} - Friendly message
   */
  export const createResultsSummary = (results) => {
    if (!results || !results.data) return '';
    
    const rowCount = results.data.length;
    
    if (rowCount === 0) {
      return 'No data found for your query.';
    } else if (rowCount === 1) {
      return '1 row found.';
    } else {
      return `${rowCount} rows found.`;
    }
  };