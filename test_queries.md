Query 1: Country Performance Analysis

  Natural Language:
  Show the average points, average price, and wine count for the top 10 countries by number of wines

  Expected SQL:
  SELECT country,
         ROUND(AVG(points), 1) as avg_points,
         ROUND(AVG(price), 2) as avg_price,
         COUNT(*) as wine_count
  FROM winemagdata_first150k
  GROUP BY country
  ORDER BY wine_count DESC
  LIMIT 10

  Features to Demo:
  - ✅ Bar chart visualization
  - ✅ Pin to dashboard
  - ✅ Explain button
  - ✅ View SQL

  ---
  Query 2: Premium Wines Discovery

  Natural Language:
  Find the top 15 highest rated wines with price over 100 dollars, show winery, variety, points, price and country

  Expected SQL:
  SELECT winery, variety, points, price, country
  FROM winemagdata_first150k
  WHERE price > 100 AND points >= 95
  ORDER BY points DESC, price DESC
  LIMIT 15

  Features to Demo:
  - ✅ Table visualization
  - ✅ Drill-down rows
  - ✅ Monaco editor - Edit SQL
  - ✅ Run modified query

  ---
  Query 3: Best Value Analysis

  Natural Language:
  What are the top 10 grape varieties with the best average rating for wines priced under 30 dollars with at least 100 wines

  Expected SQL:
  SELECT variety,
         ROUND(AVG(points), 2) as avg_rating,
         ROUND(AVG(price), 2) as avg_price,
         COUNT(*) as total_wines
  FROM winemagdata_first150k
  WHERE price < 30
  GROUP BY variety
  HAVING COUNT(*) >= 100
  ORDER BY avg_rating DESC
  LIMIT 10

  Features to Demo:
  - ✅ Complex aggregation with HAVING
  - ✅ Schema tab (show column types)
  - ✅ Export CSV
  - ✅ Regenerate SQL

  ---
  Demo Flow Suggestion
  ┌──────┬──────────────────┬──────────────────────┐
  │ Step │      Action      │    Feature Shown     │
  ├──────┼──────────────────┼──────────────────────┤
  │ 1    │ Upload CSV       │ Smart Onboarding     │
  ├──────┼──────────────────┼──────────────────────┤
  │ 2    │ Run Query 1      │ NL→SQL, Bar Chart    │
  ├──────┼──────────────────┼──────────────────────┤
  │ 3    │ Click Explain    │ AI Explanation       │
  ├──────┼──────────────────┼──────────────────────┤
  │ 4    │ Click Pin        │ Dashboard Pin        │
  ├──────┼──────────────────┼──────────────────────┤
  │ 5    │ Run Query 2      │ Table Results        │
  ├──────┼──────────────────┼──────────────────────┤
  │ 6    │ Click Drill-down │ Row Details          │
  ├──────┼──────────────────┼──────────────────────┤
  │ 7    │ Go to SQL tab    │ Monaco Editor        │
  ├──────┼──────────────────┼──────────────────────┤
  │ 8    │ Edit & Run SQL   │ Direct SQL Execution │
  ├──────┼──────────────────┼──────────────────────┤
  │ 9    │ Run Query 3      │ Complex Aggregation  │
  ├──────┼──────────────────┼──────────────────────┤
  │ 10   │ Check Schema tab │ Data Dictionary      │
  ├──────┼──────────────────┼──────────────────────┤
  │ 11   │ View Dashboard   │ Pinned Charts        │
  └──────┴──────────────────┴──────────────────────┘