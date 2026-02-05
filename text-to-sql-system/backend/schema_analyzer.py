# schema_analyzer.py
from typing import Dict, List, Tuple, Any
import psycopg2
import psycopg2.extras
import pandas as pd
import numpy as np
from collections import defaultdict
import json
import re


class SchemaAnalyzer:
    """
    Analyzes PostgreSQL database schema and data to provide insights for text-to-SQL conversion
    """
    
    def __init__(self, db_connection):
        self.connection = db_connection
    
    def analyze_table(self, table_name: str) -> Dict[str, Any]:
        """
        Perform comprehensive analysis of a table's structure and data
        """
        cursor = self.connection.cursor()
        
        # Get basic table info from PostgreSQL information_schema
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = %s
            ORDER BY ordinal_position
        """, (table_name,))
        columns_info = cursor.fetchall()
        
        # Get row count
        cursor.execute(f"SELECT COUNT(*) as count FROM {table_name}")
        row_count = cursor.fetchone()['count']  # FIXED: Access using column name 'count'
        
        # Get primary key information
        cursor.execute("""
            SELECT a.attname as column_name
            FROM pg_index i
            JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE i.indrelid = %s::regclass AND i.indisprimary
        """, (table_name,))
        primary_keys = [row["column_name"] for row in cursor.fetchall()]
        
        # Get sample data (for data type inference and statistics)
        cursor.execute(f"SELECT * FROM {table_name} LIMIT 1000")
        sample_data = cursor.fetchall()
        column_names = [desc[0] for desc in cursor.description]
        
        # Convert to DataFrame for easier analysis
        df = pd.DataFrame(sample_data)
        
        # Analyze each column
        column_analysis = []
        for col_name in column_names:
            analysis = self._analyze_column(df, col_name)
            column_analysis.append({
                "name": col_name,
                "analysis": analysis
            })
        
        # Find potential relationships
        relationships = self._detect_relationships(table_name)
        
        # Identify foreign keys
        foreign_keys = self._identify_foreign_keys(table_name)
        
        # Compile full analysis
        full_analysis = {
            "table_name": table_name,
            "row_count": row_count,
            "columns": [
                {
                    "name": col["column_name"],
                    "type": col["data_type"],
                    "nullable": col["is_nullable"] == "YES",
                    "is_primary_key": col["column_name"] in primary_keys,
                    "stats": next((c["analysis"] for c in column_analysis if c["name"] == col["column_name"]), {})
                }
                for col in columns_info
            ],
            "relationships": relationships,
            "keys": {
                "primary_keys": primary_keys,
                "foreign_keys": foreign_keys
            },
            "sample_queries": self._generate_sample_queries(table_name, column_names)
        }
        
        return full_analysis
    
    def _analyze_column(self, df: pd.DataFrame, column_name: str) -> Dict[str, Any]:
        """
        Analyze a single column for data types, patterns, and statistics
        """
        if column_name not in df.columns:
            return {"error": "Column not found in dataframe"}
            
        series = df[column_name]
        
        # Try to determine the data type
        if pd.api.types.is_numeric_dtype(series):
            return self._analyze_numeric_column(series)
        elif pd.api.types.is_datetime64_dtype(series) or self._looks_like_date(series):
            return self._analyze_datetime_column(series)
        else:
            return self._analyze_text_column(series)
    
    def _looks_like_date(self, series: pd.Series) -> bool:
        """
        Check if a series might contain dates even if not detected as datetime
        """
        # Sample some non-null values
        sample = series.dropna().head(5).astype(str)
        
        # Common date patterns
        date_patterns = [
            r'^\d{4}-\d{2}-\d{2}',  # YYYY-MM-DD
            r'^\d{2}/\d{2}/\d{4}',  # MM/DD/YYYY
            r'^\d{2}-\d{2}-\d{4}',  # DD-MM-YYYY
            r'^\d{2}\.\d{2}\.\d{4}', # DD.MM.YYYY
        ]
        
        # Check if most values match date patterns
        pattern_matches = 0
        for val in sample:
            if any(re.match(pattern, val) for pattern in date_patterns):
                pattern_matches += 1
                
        return pattern_matches >= len(sample) * 0.8 if len(sample) > 0 else False
    
    def _analyze_numeric_column(self, series: pd.Series) -> Dict[str, Any]:
        """
        Analyze a numeric column
        """
        stats = {
            "data_type": "numeric",
            "min": float(series.min()) if not pd.isna(series.min()) else None,
            "max": float(series.max()) if not pd.isna(series.max()) else None,
            "mean": float(series.mean()) if not pd.isna(series.mean()) else None,
            "median": float(series.median()) if not pd.isna(series.median()) else None,
            "std_dev": float(series.std()) if not pd.isna(series.std()) else None,
            "null_count": int(series.isna().sum()),
            "null_percentage": float(series.isna().mean() * 100),
            "unique_values": int(series.nunique()),
            "is_integer": pd.api.types.is_integer_dtype(series) or all(float(x).is_integer() for x in series.dropna() if pd.notna(x)),
        }
        
        # Check if it might be a categorical column despite being numeric
        if stats["unique_values"] < 10 and len(series) > stats["unique_values"] * 2:
            stats["appears_to_be_categorical"] = True
            value_counts = series.value_counts().head(10).to_dict()
            # Convert keys to strings for JSON serialization if needed
            stats["value_counts"] = {str(k): v for k, v in value_counts.items()}
        
        return stats
    
    def _analyze_datetime_column(self, series: pd.Series) -> Dict[str, Any]:
        """
        Analyze a datetime column
        """
        # Try to convert to datetime if not already
        if not pd.api.types.is_datetime64_dtype(series):
            try:
                series = pd.to_datetime(series)
            except:
                # If conversion fails, treat as text
                return self._analyze_text_column(series)
        
        try:
            stats = {
                "data_type": "datetime",
                "min": series.min().isoformat() if not pd.isna(series.min()) else None,
                "max": series.max().isoformat() if not pd.isna(series.max()) else None,
                "null_count": int(series.isna().sum()),
                "null_percentage": float(series.isna().mean() * 100),
                "unique_values": int(series.nunique()),
            }
            
            # Calculate time span in days if possible
            try:
                if not pd.isna(series.min()) and not pd.isna(series.max()):
                    stats["time_span_days"] = (series.max() - series.min()).days
            except:
                pass
            
            # Detect if this might be a time series column
            if stats["unique_values"] > 10:
                # Check if values are evenly spaced
                sorted_dates = sorted(series.dropna().unique())
                if len(sorted_dates) > 2:
                    try:
                        diffs = [(sorted_dates[i] - sorted_dates[i-1]).total_seconds() for i in range(1, min(10, len(sorted_dates)))]
                        std_diff = np.std(diffs)
                        mean_diff = np.mean(diffs)
                        if std_diff / mean_diff < 0.2 or all(d == diffs[0] for d in diffs):
                            stats["appears_to_be_time_series"] = True
                            stats["approximate_frequency"] = str(pd.Timedelta(seconds=mean_diff))
                    except:
                        pass
            
            return stats
        except Exception as e:
            # Fallback to text analysis if datetime analysis fails
            return self._analyze_text_column(series)
    
    def _analyze_text_column(self, series: pd.Series) -> Dict[str, Any]:
        """
        Analyze a text column
        """
        # Get cleaned series without NaN values
        clean_series = series.dropna().astype(str)
        
        stats = {
            "data_type": "text",
            "min_length": min((len(str(x)) for x in clean_series), default=0) if not clean_series.empty else 0,
            "max_length": max((len(str(x)) for x in clean_series), default=0) if not clean_series.empty else 0,
            "null_count": int(series.isna().sum()),
            "null_percentage": float(series.isna().mean() * 100),
            "unique_values": int(series.nunique()),
            "is_unique": series.nunique() == len(series)
        }
        
        # Check if it might be a categorical column
        if stats["unique_values"] < 20 and len(series) > stats["unique_values"] * 2:
            stats["appears_to_be_categorical"] = True
            value_counts = series.value_counts().head(10).to_dict()
            stats["value_counts"] = value_counts
        
        # Check for specific patterns
        if clean_series.empty:
            return stats
            
        # Email pattern check
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        email_matches = clean_series.str.match(email_pattern)
        if email_matches.mean() > 0.7:  # If >70% match email pattern
            stats["appears_to_be_email"] = True
        
        # URL pattern check
        url_pattern = r'^(http|https)://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        url_matches = clean_series.str.match(url_pattern)
        if url_matches.mean() > 0.7:  # If >70% match URL pattern
            stats["appears_to_be_url"] = True
            
        # Check if it might be a name column
        name_indicators = ['name', 'person', 'customer', 'employee', 'user']
        if any(ind in series.name.lower() for ind in name_indicators) and stats["max_length"] < 100:
            stats["might_be_name"] = True
            
        return stats
    
    def _detect_relationships(self, table_name: str) -> List[Dict[str, Any]]:
        """
        Detect potential relationships with other tables in PostgreSQL
        """
        cursor = self.connection.cursor()
        
        # Get all tables in the database
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        all_tables = [row["table_name"] for row in cursor.fetchall()]  # FIXED: Access using column name
        
        # Remove the current table from the list
        other_tables = [t for t in all_tables if t != table_name]
        
        relationships = []
        
        # Get columns from current table
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = %s
        """, (table_name,))
        table_columns = [row["column_name"] for row in cursor.fetchall()]  # FIXED: Access using column name
        
        # Check for foreign key constraints
        cursor.execute("""
            SELECT
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM
                information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = %s
        """, (table_name,))
        fk_constraints = cursor.fetchall()
        
        # Add foreign key relationships
        for fk in fk_constraints:
            relationships.append({
                "type": "foreign_key",
                "from_table": table_name,
                "from_column": fk["column_name"],  # FIXED: Access using column name
                "to_table": fk["foreign_table_name"],  # FIXED: Access using column name
                "to_column": fk["foreign_column_name"]  # FIXED: Access using column name
            })
        
        # Look for naming pattern relationships
        for col in table_columns:
            for other_table in other_tables:
                # Check if column name is like other_table_id
                if col.lower() == f"{other_table.lower()}_id":
                    # Check if this is already covered by an FK constraint
                    if not any(rel["from_column"] == col and rel["to_table"] == other_table for rel in relationships):
                        relationships.append({
                            "type": "naming_pattern",
                            "from_table": table_name,
                            "from_column": col,
                            "to_table": other_table,
                            "to_column": "id"  # Assuming the other table has an id column
                        })
                
                # Check for potential many-to-many relationships through junction tables
                if len(table_columns) <= 3 and len(other_tables) >= 2:
                    # This might be a junction table if it has few columns and at least 2 look like foreign keys
                    fk_like_columns = [c for c in table_columns if c.endswith('_id')]
                    if len(fk_like_columns) >= 2:
                        for i, fk1 in enumerate(fk_like_columns):
                            for fk2 in fk_like_columns[i+1:]:
                                # Try to extract table names from column names
                                table1 = fk1.replace('_id', '')
                                table2 = fk2.replace('_id', '')
                                if table1 in other_tables and table2 in other_tables:
                                    relationships.append({
                                        "type": "junction_table",
                                        "junction_table": table_name,
                                        "table1": table1,
                                        "column1": fk1,
                                        "table2": table2,
                                        "column2": fk2
                                    })
        
        return relationships
    
    def _identify_foreign_keys(self, table_name: str) -> List[str]:
        """
        Identify foreign keys in PostgreSQL
        """
        cursor = self.connection.cursor()
        
        cursor.execute("""
            SELECT kcu.column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = %s
        """, (table_name,))
        
        foreign_keys = [row["column_name"] for row in cursor.fetchall()]  # FIXED: Access using column name
        return foreign_keys
    
    def _generate_sample_queries(self, table_name: str, columns: List[str]) -> List[Dict[str, str]]:
        """
        Generate sample PostgreSQL queries that demonstrate how to query this table
        """
        samples = []
        
        # Basic SELECT
        samples.append({
            "description": "Select all rows",
            "sql": f'SELECT * FROM "{table_name}"'
        })
        
        # SELECT with WHERE
        if len(columns) > 0:
            samples.append({
                "description": f"Select filtered by {columns[0]}",
                "sql": f'SELECT * FROM "{table_name}" WHERE "{columns[0]}" = $1'
            })
        
        # COUNT
        samples.append({
            "description": "Count all rows",
            "sql": f'SELECT COUNT(*) FROM "{table_name}"'
        })
        
        # GROUP BY (if multiple columns)
        if len(columns) > 1:
            numeric_columns = []
            # Try to identify numeric columns for aggregation
            cursor = self.connection.cursor()
            cursor.execute("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = %s AND data_type IN 
                ('integer', 'bigint', 'smallint', 'decimal', 'numeric', 'real', 'double precision')
            """, (table_name,))
            numeric_columns = [row["column_name"] for row in cursor.fetchall()]  # FIXED: Access using column name
            
            # Find a good candidate for GROUP BY (non-numeric)
            groupby_candidates = [col for col in columns if col not in numeric_columns]
            if groupby_candidates:
                groupby_col = groupby_candidates[0]
                agg_columns = numeric_columns[:2]  # Take up to 2 numeric columns for aggregation
                
                if agg_columns:
                    samples.append({
                        "description": f"Group by {groupby_col} with aggregations",
                        "sql": f'SELECT "{groupby_col}", COUNT(*) as count, ' + 
                              ', '.join([f'SUM("{col}") as sum_{col}' for col in agg_columns]) + 
                              f' FROM "{table_name}" GROUP BY "{groupby_col}"'
                    })
                else:
                    samples.append({
                        "description": f"Group by {groupby_col} with count",
                        "sql": f'SELECT "{groupby_col}", COUNT(*) as count FROM "{table_name}" GROUP BY "{groupby_col}"'
                    })
        
        # ORDER BY
        if len(columns) > 0:
            samples.append({
                "description": f"Order by {columns[0]} descending",
                "sql": f'SELECT * FROM "{table_name}" ORDER BY "{columns[0]}" DESC'
            })
        
        # LIMIT and OFFSET for pagination
        samples.append({
            "description": "Pagination example",
            "sql": f'SELECT * FROM "{table_name}" LIMIT 10 OFFSET 0'
        })
        
        # JOIN with related tables
        cursor = self.connection.cursor()
        cursor.execute("""
            SELECT
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM
                information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = %s
            LIMIT 1
        """, (table_name,))
        fk = cursor.fetchone()
        
        if fk:
            # Get a column from the foreign table for the join example
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = %s 
                LIMIT 2
            """, (fk["foreign_table_name"],))  # FIXED: Access using column name
            foreign_columns = [row["column_name"] for row in cursor.fetchall()]  # FIXED: Access using column name
            
            if foreign_columns:
                join_col = next((col for col in foreign_columns if col != fk["foreign_column_name"]), foreign_columns[0])  # FIXED: Access using column name
                samples.append({
                    "description": f"Join with {fk['foreign_table_name']}",  # FIXED: Access using column name
                    "sql": f'SELECT a.*, b."{join_col}" FROM "{table_name}" a ' +
                          f'JOIN "{fk["foreign_table_name"]}" b ON a."{fk["column_name"]}" = b."{fk["foreign_column_name"]}"'  # FIXED: Access using column name
                })
        
        # Date filtering (if we have date columns)
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = %s AND data_type IN 
            ('date', 'timestamp', 'timestamp without time zone', 'timestamp with time zone')
            LIMIT 1
        """, (table_name,))
        date_column = cursor.fetchone()
        
        if date_column:
            date_col = date_column["column_name"]  # FIXED: Access using column name
            samples.append({
                "description": f"Filter by date range",
                "sql": f'SELECT * FROM "{table_name}" WHERE "{date_col}" BETWEEN $1 AND $2'
            })
            
            samples.append({
                "description": f"Group by month",
                "sql": f'SELECT DATE_TRUNC(\'month\', "{date_col}") as month, COUNT(*) FROM "{table_name}" GROUP BY month ORDER BY month'
            })
        
        # Full text search (if we have text columns)
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = %s AND data_type IN 
            ('character varying', 'varchar', 'text', 'char', 'character')
            LIMIT 1
        """, (table_name,))
        text_column = cursor.fetchone()
        
        if text_column:
            text_col = text_column["column_name"]  # FIXED: Access using column name
            samples.append({
                "description": f"Text search",
                "sql": f'SELECT * FROM "{table_name}" WHERE "{text_col}" ILIKE \'%\' || $1 || \'%\''
            })
        
        return samples
    
    def get_table_columns(self, table_name: str) -> List[Dict[str, Any]]:
        """
        Get detailed information about table columns
        """
        cursor = self.connection.cursor()
        
        cursor.execute("""
            SELECT 
                c.column_name, 
                c.data_type, 
                c.is_nullable,
                c.character_maximum_length,
                c.numeric_precision,
                c.numeric_scale,
                pgd.description
            FROM 
                information_schema.columns c
            LEFT JOIN 
                pg_catalog.pg_statio_all_tables st ON c.table_name = st.relname
            LEFT JOIN 
                pg_catalog.pg_description pgd ON pgd.objoid = st.relid AND pgd.objsubid = c.ordinal_position
            WHERE 
                c.table_name = %s
            ORDER BY 
                c.ordinal_position
        """, (table_name,))
        
        columns = cursor.fetchall()
        return [dict(col) for col in columns]
    
    def get_schema_metadata(self) -> Dict[str, Any]:
        """
        Get comprehensive metadata about the entire database schema
        """
        cursor = self.connection.cursor()
        
        # Get all tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        tables = [row["table_name"] for row in cursor.fetchall()]  # FIXED: Access using column name
        
        # Analyze each table
        schema_metadata = {
            "tables": [],
            "relationships": []
        }
        
        for table in tables:
            table_analysis = self.analyze_table(table)
            schema_metadata["tables"].append(table_analysis)
            
            # Add relationships
            for relationship in table_analysis["relationships"]:
                if relationship not in schema_metadata["relationships"]:
                    schema_metadata["relationships"].append(relationship)
        
        return schema_metadata
    
    def generate_schema_summary(self) -> str:
        """
        Generate a human-readable summary of the database schema
        """
        metadata = self.get_schema_metadata()
        
        summary = "# Database Schema Summary\n\n"
        
        # Tables
        summary += f"## Tables ({len(metadata['tables'])})\n\n"
        
        for table in metadata['tables']:
            summary += f"### {table['table_name']}\n"
            summary += f"* Row count: {table['row_count']}\n"
            summary += f"* Columns: {len(table['columns'])}\n"
            
            # Primary keys
            if table['keys']['primary_keys']:
                summary += f"* Primary keys: {', '.join(table['keys']['primary_keys'])}\n"
            
            # Foreign keys
            if table['keys']['foreign_keys']:
                summary += f"* Foreign keys: {', '.join(table['keys']['foreign_keys'])}\n"
            
            summary += "\n#### Columns\n\n"
            summary += "| Name | Type | Nullable | Description |\n"
            summary += "|------|------|----------|-------------|\n"
            
            for col in table['columns']:
                # Generate column description based on stats
                description = []
                stats = col.get('stats', {})
                
                if stats.get('is_unique'):
                    description.append("Unique values")
                
                if stats.get('appears_to_be_categorical'):
                    description.append("Categorical")
                    
                if stats.get('data_type') == 'numeric':
                    if stats.get('min') is not None and stats.get('max') is not None:
                        description.append(f"Range: {stats.get('min')} - {stats.get('max')}")
                
                if stats.get('null_percentage', 0) > 0:
                    description.append(f"{stats.get('null_percentage'):.1f}% null")
                
                description_str = ", ".join(description)
                
                summary += f"| {col['name']} | {col['type']} | {'Yes' if col['nullable'] else 'No'} | {description_str} |\n"
            
            summary += "\n"
        
        # Relationships
        if metadata['relationships']:
            summary += "## Relationships\n\n"
            summary += "| Type | From Table | From Column | To Table | To Column |\n"
            summary += "|------|------------|------------|----------|----------|\n"
            
            for rel in metadata['relationships']:
                if rel['type'] in ['foreign_key', 'naming_pattern']:
                    summary += f"| {rel['type']} | {rel['from_table']} | {rel['from_column']} | {rel['to_table']} | {rel['to_column']} |\n"
                elif rel['type'] == 'junction_table':
                    summary += f"| {rel['type']} | {rel['table1']} | {rel['column1']} | {rel['table2']} | {rel['column2']} |\n"
        
        return summary
    
    def get_sample_data(self, table_name: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Get sample data from a table
        """
        cursor = self.connection.cursor()
        cursor.execute(f"SELECT * FROM \"{table_name}\" LIMIT %s", (limit,))
        rows = cursor.fetchall()
        return [dict(row) for row in rows]