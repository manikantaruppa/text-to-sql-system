// import React, { useState, useEffect } from 'react';
// import {
//   BarChart, Bar, LineChart, Line, PieChart, Pie,
//   XAxis, YAxis, CartesianGrid, Tooltip, Legend,
//   ResponsiveContainer, Cell
// } from 'recharts';

// const COLORS = [
//   '#0284c7', '#0369a1', '#0ea5e9', '#38bdf8', 
//   '#14b8a6', '#0d9488', '#2dd4bf', '#5eead4',
//   '#6366f1', '#4f46e5', '#818cf8', '#a5b4fc',
//   '#ec4899', '#db2777', '#f472b6', '#fbcfe8'
// ];

// const DataVisualization = ({ data, type, title }) => {
//   const [chartData, setChartData] = useState([]);
//   const [dataKeys, setDataKeys] = useState({ category: '', values: [] });
  
//   useEffect(() => {
//     if (!data || data.length === 0) return;
    
//     // Process data for visualization
//     const processedData = formatData(data);
//     setChartData(processedData.data);
//     setDataKeys(processedData.keys);
//   }, [data]);
  
//   // Format data for visualization
//   const formatData = (rawData) => {
//     if (!rawData || rawData.length === 0) {
//       return { data: [], keys: { category: '', values: [] } };
//     }
    
//     // Get all keys from the first data item
//     const allKeys = Object.keys(rawData[0]);
    
//     // For most charts, assume first column is category and rest are values
//     const categoryKey = allKeys[0];
//     const valueKeys = allKeys.slice(1);
    
//     // Special case for pie chart - needs exactly one value column
//     if (type === 'pie' && valueKeys.length > 1) {
//       return {
//         data: rawData,
//         keys: { category: categoryKey, values: [valueKeys[0]] }
//       };
//     }
    
//     return {
//       data: rawData,
//       keys: { category: categoryKey, values: valueKeys }
//     };
//   };
  
//   // Render appropriate chart based on type
//   const renderChart = () => {
//     if (!chartData || chartData.length === 0) {
//       return <div className="text-center py-10 text-gray-500">No data available for visualization</div>;
//     }
    
//     switch (type) {
//       case 'bar':
//         return (
//           <ResponsiveContainer width="100%" height={400}>
//             <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
//               <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
//               <XAxis 
//                 dataKey={dataKeys.category} 
//                 angle={-45} 
//                 textAnchor="end" 
//                 tick={{ fill: '#4b5563', fontSize: 12 }}
//                 tickMargin={10}
//                 height={80}
//               />
//               <YAxis 
//                 tick={{ fill: '#4b5563', fontSize: 12 }}
//               />
//               <Tooltip 
//                 contentStyle={{ 
//                   backgroundColor: 'white', 
//                   border: '1px solid #e5e7eb',
//                   borderRadius: '6px',
//                   boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
//                 }}
//               />
//               <Legend wrapperStyle={{ paddingTop: 20 }} />
//               {dataKeys.values.map((key, index) => (
//                 <Bar 
//                   key={key} 
//                   dataKey={key} 
//                   fill={COLORS[index % COLORS.length]} 
//                   name={key.replace(/_/g, ' ')}
//                   radius={[4, 4, 0, 0]}
//                 />
//               ))}
//             </BarChart>
//           </ResponsiveContainer>
//         );
        
//       case 'line':
//         return (
//           <ResponsiveContainer width="100%" height={400}>
//             <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
//               <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
//               <XAxis 
//                 dataKey={dataKeys.category} 
//                 angle={-45} 
//                 textAnchor="end" 
//                 tick={{ fill: '#4b5563', fontSize: 12 }}
//                 tickMargin={10}
//                 height={80}
//               />
//               <YAxis 
//                 tick={{ fill: '#4b5563', fontSize: 12 }}
//               />
//               <Tooltip 
//                 contentStyle={{ 
//                   backgroundColor: 'white', 
//                   border: '1px solid #e5e7eb',
//                   borderRadius: '6px',
//                   boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
//                 }}
//               />
//               <Legend wrapperStyle={{ paddingTop: 20 }} />
//               {dataKeys.values.map((key, index) => (
//                 <Line 
//                   key={key} 
//                   type="monotone" 
//                   dataKey={key} 
//                   stroke={COLORS[index % COLORS.length]} 
//                   name={key.replace(/_/g, ' ')}
//                   strokeWidth={2}
//                   dot={{ r: 4, strokeWidth: 2 }}
//                   activeDot={{ r: 6, strokeWidth: 0 }}
//                 />
//               ))}
//             </LineChart>
//           </ResponsiveContainer>
//         );
        
//       case 'pie':
//         // For pie chart, we use the first value column if multiple exist
//         const valueKey = dataKeys.values[0];
        
//         return (
//           <ResponsiveContainer width="100%" height={400}>
//             <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
//               <Pie
//                 data={chartData}
//                 dataKey={valueKey}
//                 nameKey={dataKeys.category}
//                 cx="50%"
//                 cy="50%"
//                 outerRadius={150}
//                 labelLine={true}
//                 label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
//               >
//                 {chartData.map((entry, index) => (
//                   <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
//                 ))}
//               </Pie>
//               <Tooltip 
//                 formatter={(value) => [`${value}`, valueKey.replace(/_/g, ' ')]}
//                 contentStyle={{
//                   backgroundColor: 'white', 
//                   border: '1px solid #e5e7eb',
//                   borderRadius: '6px',
//                   boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
//                 }}
//               />
//               <Legend wrapperStyle={{ paddingTop: 20 }} />
//             </PieChart>
//           </ResponsiveContainer>
//         );
        
//       default:
//         // Fallback to data table for unknown chart type
//         return renderDataTable();
//     }
//   };
  
//   // Render data as a table (fallback option)
//   const renderDataTable = () => {
//     if (!chartData || chartData.length === 0) {
//       return <div className="text-center py-10 text-gray-500">No data available</div>;
//     }
    
//     return (
//       <div className="overflow-x-auto">
//         <table className="min-w-full divide-y divide-gray-200">
//           <thead>
//             <tr>
//               {Object.keys(chartData[0]).map((key) => (
//                 <th 
//                   key={key} 
//                   className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
//                 >
//                   {key.replace(/_/g, ' ')}
//                 </th>
//               ))}
//             </tr>
//           </thead>
//           <tbody className="bg-white divide-y divide-gray-200">
//             {chartData.map((row, rowIndex) => (
//               <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
//                 {Object.entries(row).map(([key, value], cellIndex) => (
//                   <td 
//                     key={`${rowIndex}-${cellIndex}`} 
//                     className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
//                   >
//                     {value !== null ? String(value) : 'N/A'}
//                   </td>
//                 ))}
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     );
//   };
  
//   return (
//     <div className="bg-white p-6 rounded-lg shadow-card">
//       {title && <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>}
//       <div className="h-full">
//         {renderChart()}
//       </div>
//     </div>
//   );
// };

// export default DataVisualization;




import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, AreaChart, Area
} from 'recharts';

const COLORS = [
  '#0284c7', '#0369a1', '#0ea5e9', '#38bdf8', 
  '#14b8a6', '#0d9488', '#2dd4bf', '#5eead4',
  '#6366f1', '#4f46e5', '#818cf8', '#a5b4fc',
  '#ec4899', '#db2777', '#f472b6', '#fbcfe8'
];

const DataVisualization = ({ data, type, title }) => {
  const [chartData, setChartData] = useState([]);
  const [dataKeys, setDataKeys] = useState({ category: '', values: [] });
  const [dataFormat, setDataFormat] = useState('standard'); // 'standard', 'singleValue', 'timeSeries'
  
  // Transform and analyze data on component mount or when data changes
  useEffect(() => {
    if (!data || data.length === 0) {
      setDataFormat('empty');
      return;
    }
    
    console.log("Raw data from backend:", data);
    console.log("Suggested visualization type:", type);
    
    // Detect data format
    const detectedFormat = detectDataFormat(data);
    setDataFormat(detectedFormat);
    
    // Transform data based on format
    const transformedData = transformData(data, detectedFormat, type);
    setChartData(transformedData.data);
    setDataKeys(transformedData.keys);
    
    console.log("Transformed chart data:", transformedData);
  }, [data, type]);
  
  // Detect the format of the data
  const detectDataFormat = (rawData) => {
    // Check if there's only a single record with 1-2 fields (likely a metric)
    if (rawData.length === 1 && Object.keys(rawData[0]).length <= 2) {
      return 'singleValue';
    }
    
    // Check if this might be time series data
    const firstRow = rawData[0];
    const firstKey = Object.keys(firstRow)[0];
    const potentialDateValues = rawData.map(row => row[firstKey]);
    const allDateLike = potentialDateValues.every(val => !isNaN(Date.parse(val)));
    
    if (allDateLike) {
      return 'timeSeries';
    }
    
    // Default format
    return 'standard';
  };
  
  // Transform data based on the detected format and visualization type
  const transformData = (rawData, format, visType) => {
    switch (format) {
      case 'singleValue':
        // For a single value (like an accuracy metric)
        const key = Object.keys(rawData[0])[0];
        const value = rawData[0][key];
        
        // Create synthetic data for visualization
        if (typeof value === 'number') {
          // For percentage or numeric values
          return {
            data: [
              { name: key, value: value },
              // Add an "empty" portion if this is a percentage
              ...(value <= 100 ? [{ name: 'remainder', value: 100 - value }] : [])
            ],
            keys: { category: 'name', values: ['value'] }
          };
        } else {
          // For non-numeric single values
          return {
            data: [{ name: key, value: value }],
            keys: { category: 'name', values: ['value'] }
          };
        }
        
      case 'timeSeries':
        // For time series data, ensure dates are properly formatted
        const categoryKey = Object.keys(rawData[0])[0];
        const valueKeys = Object.keys(rawData[0]).filter(k => k !== categoryKey);
        
        // Format dates and ensure numeric values
        const formattedData = rawData.map(row => {
          const newRow = { [categoryKey]: new Date(row[categoryKey]).toLocaleDateString() };
          valueKeys.forEach(key => {
            newRow[key] = typeof row[key] === 'number' ? row[key] : parseFloat(row[key]) || 0;
          });
          return newRow;
        });
        
        return {
          data: formattedData,
          keys: { category: categoryKey, values: valueKeys }
        };
        
      case 'standard':
      default:
        // For regular tabular data
        const catKey = Object.keys(rawData[0])[0];
        const valKeys = Object.keys(rawData[0]).filter(k => k !== catKey);
        
        return {
          data: rawData,
          keys: { category: catKey, values: valKeys }
        };
    }
  };
  
  // Render a single value metric (like accuracy)
  const renderSingleValueMetric = () => {
    if (!chartData || chartData.length === 0) return null;
    
    const value = chartData[0].value;
    const name = chartData[0].name;
    const isPercentage = typeof value === 'number' && value <= 100;
    
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="text-4xl font-bold text-primary-600">
          {isPercentage 
            ? `${value.toFixed(2)}%` 
            : typeof value === 'number' 
              ? value.toLocaleString() 
              : value}
        </div>
        <div className="mt-2 text-gray-700 text-lg capitalize">
          {name.replace(/_/g, ' ')}
        </div>
        
        {isPercentage && (
          <div className="w-full max-w-md mt-6 px-4">
            <div className="w-full bg-gray-200 rounded-full h-6">
              <div 
                className="bg-primary-600 h-6 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(value, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Render appropriate chart based on data format and type
  const renderChart = () => {
    if (!chartData || chartData.length === 0) {
      return (
        <div className="text-center py-10 text-gray-500">
          No data available for visualization
        </div>
      );
    }
    
    // For single value metrics
    if (dataFormat === 'singleValue') {
      // Override the chart type for single values depending on the nature of the value
      const value = chartData[0].value;
      
      // If it's a percentage, show a gauge/progress visualization
      if (typeof value === 'number' && value <= 100) {
        return renderSingleValueMetric();
      }
      
      // For other single values, use a simple display
      return renderSingleValueMetric();
    }
    
    // For time series data, prefer line or area charts
    if (dataFormat === 'timeSeries') {
      return renderTimeSeriesChart();
    }
    
    // For standard data formats, use the suggested visualization type
    switch (type) {
      case 'bar':
        return renderBarChart();
      case 'line':
        return renderLineChart();
      case 'pie':
        return renderPieChart();
      case 'area':
        return renderAreaChart();
      default:
        // If we don't have a specific visualization, show a table
        return renderDataTable();
    }
  };
  
  // Render a bar chart
  const renderBarChart = () => {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey={dataKeys.category} 
            angle={-45} 
            textAnchor="end" 
            tick={{ fill: '#4b5563', fontSize: 12 }}
            tickMargin={10}
            height={80}
          />
          <YAxis 
            tick={{ fill: '#4b5563', fontSize: 12 }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
            }}
          />
          <Legend wrapperStyle={{ paddingTop: 20 }} />
          {dataKeys.values.map((key, index) => (
            <Bar 
              key={key} 
              dataKey={key} 
              fill={COLORS[index % COLORS.length]} 
              name={key.replace(/_/g, ' ')}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };
  
  // Render a line chart
  const renderLineChart = () => {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey={dataKeys.category} 
            angle={-45} 
            textAnchor="end" 
            tick={{ fill: '#4b5563', fontSize: 12 }}
            tickMargin={10}
            height={80}
          />
          <YAxis 
            tick={{ fill: '#4b5563', fontSize: 12 }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
            }}
          />
          <Legend wrapperStyle={{ paddingTop: 20 }} />
          {dataKeys.values.map((key, index) => (
            <Line 
              key={key} 
              type="monotone" 
              dataKey={key} 
              stroke={COLORS[index % COLORS.length]} 
              name={key.replace(/_/g, ' ')}
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };
  
  // Render a pie chart
  const renderPieChart = () => {
    // Pie charts need specific data format
    const valueKey = dataKeys.values[0];
    
    return (
      <ResponsiveContainer width="100%" height={400}>
        <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <Pie
            data={chartData}
            dataKey={valueKey}
            nameKey={dataKeys.category}
            cx="50%"
            cy="50%"
            outerRadius={150}
            labelLine={true}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value) => [`${value}`, valueKey.replace(/_/g, ' ')]}
            contentStyle={{
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
            }}
          />
          <Legend wrapperStyle={{ paddingTop: 20 }} />
        </PieChart>
      </ResponsiveContainer>
    );
  };
  
  // Render an area chart (good for time series)
  const renderAreaChart = () => {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey={dataKeys.category} 
            angle={-45} 
            textAnchor="end" 
            tick={{ fill: '#4b5563', fontSize: 12 }}
            tickMargin={10}
            height={80}
          />
          <YAxis 
            tick={{ fill: '#4b5563', fontSize: 12 }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
            }}
          />
          <Legend wrapperStyle={{ paddingTop: 20 }} />
          {dataKeys.values.map((key, index) => (
            <Area 
              key={key} 
              type="monotone" 
              dataKey={key} 
              stackId="1"
              stroke={COLORS[index % COLORS.length]} 
              fill={COLORS[index % COLORS.length]} 
              fillOpacity={0.6}
              name={key.replace(/_/g, ' ')}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  };
  
  // Render a time series chart (special case handling for time data)
  const renderTimeSeriesChart = () => {
    // Default to line chart for time series
    return renderLineChart();
  };
  
  // Render data as a table (fallback option)
  const renderDataTable = () => {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              {Object.keys(chartData[0]).map((key) => (
                <th 
                  key={key} 
                  className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {key.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {chartData.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {Object.entries(row).map(([key, value], cellIndex) => (
                  <td 
                    key={`${rowIndex}-${cellIndex}`} 
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                  >
                    {value !== null ? String(value) : 'N/A'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  // Show debugging information in development mode
  const renderDebugInfo = () => {
    if (process.env.NODE_ENV !== 'development') return null;
    
    return (
      <details className="mt-4 text-xs border-t pt-2">
        <summary className="cursor-pointer text-gray-500">Debug Information</summary>
        <div className="mt-2 p-2 bg-gray-100 rounded">
          <p><strong>Data Format:</strong> {dataFormat}</p>
          <p><strong>Visualization Type:</strong> {type}</p>
          <p><strong>Category Key:</strong> {dataKeys.category}</p>
          <p><strong>Value Keys:</strong> {dataKeys.values.join(', ')}</p>
          <div className="mt-2">
            <strong>Raw Data:</strong>
            <pre className="mt-1 p-2 bg-gray-200 rounded overflow-auto max-h-40">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
          <div className="mt-2">
            <strong>Transformed Data:</strong>
            <pre className="mt-1 p-2 bg-gray-200 rounded overflow-auto max-h-40">
              {JSON.stringify(chartData, null, 2)}
            </pre>
          </div>
        </div>
      </details>
    );
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-card">
      {title && <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>}
      <div className="h-full">
        {renderChart()}
        {renderDebugInfo()}
      </div>
    </div>
  );
};

export default DataVisualization;