# prompting_service.py
import json
from typing import Dict, List, Any, Optional

class PromptingService:
    """
    Service responsible for creating structured prompts for different LLM tasks
    with PostgreSQL-specific considerations
    """
    
    @staticmethod
    def create_text_to_sql_prompt(query: str, schema: Dict[str, Any]) -> str:
        """
        Create a prompt for converting natural language to PostgreSQL compatible SQL
        """
        # Extract column information for better context
        columns_info = []
        for col in schema.get("columns", []):
            col_name = col.get("name", "")
            col_type = col.get("type", "")
            sample_values = col.get("stats", {}).get("sample_values", [])
            
            # Add more context about the column
            col_context = []
            stats = col.get("stats", {})
            
            if stats.get("appears_to_be_categorical", False):
                col_context.append("categorical")
                
            if stats.get("appears_to_be_time_series", False):
                col_context.append("time series")
                
            if col.get("is_primary_key", False):
                col_context.append("primary key")
                
            if col_name in schema.get("keys", {}).get("foreign_keys", []):
                col_context.append("foreign key")
            
            # Format sample values based on type
            if col_type.startswith(('int', 'float', 'numeric', 'decimal', 'double', 'real')):
                sample_str = ", ".join([str(val) for val in sample_values]) if sample_values else "N/A"
            else:
                sample_str = ", ".join([f'"{val}"' for val in sample_values]) if sample_values else "N/A"
                
            context_str = f" ({', '.join(col_context)})" if col_context else ""
            columns_info.append(f"- {col_name} ({col_type}){context_str}: Example values: {sample_str}")
        
        columns_str = "\n".join(columns_info)

        annotations = schema.get("annotations", {}) or {}
        aliases_info = []
        for alias in annotations.get("aliases", []):
            alias_name = alias.get("alias", "")
            column = alias.get("column", "")
            if alias_name and column:
                aliases_info.append(f"- \"{alias_name}\" → {column}")
        aliases_str = "\n".join(aliases_info)
        if aliases_str:
            aliases_str = "\n\n## Column Aliases (User terms → Columns):\n" + aliases_str

        metrics_info = []
        for metric in annotations.get("metrics", []):
            name = metric.get("name", "")
            sql = metric.get("sql", "")
            desc = metric.get("description", "")
            if name and sql:
                detail = f"{name}: {sql}"
                if desc:
                    detail += f" ({desc})"
                metrics_info.append(f"- {detail}")
        metrics_str = "\n".join(metrics_info)
        if metrics_str:
            metrics_str = "\n\n## Metric Definitions:\n" + metrics_str
        
        # Add relationship information
        relationships_info = []
        for rel in schema.get("relationships", []):
            rel_type = rel.get("type", "")
            from_col = rel.get("from_column", "")
            to_table = rel.get("to_table", "")
            to_col = rel.get("to_column", "")
            
            relationships_info.append(
                f"- {from_col} in {schema.get('table_name', '')} relates to {to_col} in {to_table} ({rel_type})"
            )
        
        relationships_str = "\n".join(relationships_info)
        if relationships_str:
            relationships_str = "\n\n## Relationships:\n" + relationships_str
        
        # Include sample queries if available
        sample_queries_info = []
        for sample in schema.get("sample_queries", []):
            desc = sample.get("description", "")
            sql = sample.get("sql", "")
            
            sample_queries_info.append(f"- {desc}:\n  ```sql\n  {sql}\n  ```")
        
        sample_queries_str = "\n".join(sample_queries_info)
        if sample_queries_str:
            sample_queries_str = "\n\n## Sample Queries:\n" + sample_queries_str
        
        prompt = f"""
        # Text-to-SQL Conversion Task

        You are an expert SQL query generator. Your task is to convert the user's natural language question into a precise, efficient PostgreSQL query.

        ## Database Information
        Table name: {schema.get("table_name", "unknown")}
        Row count: {schema.get("row_count", "unknown")}

        ## Columns:
        {columns_str}
        {relationships_str}
        {sample_queries_str}
        {aliases_str}
        {metrics_str}

        ## Task
        Convert this natural language question to a SQL query:
        "{query}"

        ## Requirements:
        1. Generate only the SQL query with no explanations or comments
        2. The query must be valid for PostgreSQL syntax
        3. Use double quotes around table and column names to handle spaces and special characters
        4. Use appropriate JOIN operations if they would be helpful
        5. Use appropriate aggregation functions when needed (COUNT, SUM, AVG, etc.)
        6. Include ORDER BY, GROUP BY, or HAVING clauses when implied by the question
        7. Handle potential NULL values appropriately with COALESCE or IS NULL checks
        8. Make the query as efficient as possible
        9. Use PostgreSQL's specific functions when appropriate (e.g., date_trunc, array_agg)

        SQL query:
        ```sql
        """
        
        return prompt
    
    @staticmethod
    def create_analysis_prompt(
        query: str, 
        sql_query: str, 
        schema: Dict[str, Any], 
        results: List[Dict[str, Any]], 
        max_results: int = 5
    ) -> str:
        """
        Create a prompt for analyzing SQL results
        """
        # Limit the results to prevent token overflow
        result_sample = results[:max_results] if results else []
        total_results = len(results) if results else 0
        
        # Format the results for better readability
        results_str = json.dumps(result_sample, indent=2) if result_sample else "[]"
        
        # Extract schema information
        columns_info = "\n".join([
            f"- {col.get('name', '')}: {col.get('type', '')}"
            for col in schema.get("columns", [])
        ])
        
        prompt = f"""
        # Data Analysis Task

        You are an expert data analyst. Your task is to analyze SQL query results from a PostgreSQL database and provide insights in natural language.

        ## Context
        User's original question: "{query}"

        SQL query used:
        ```sql
        {sql_query}
        ```

        ## Database Schema
        Table: {schema.get("table_name", "unknown")}
        Columns:
        {columns_info}

        ## Query Results
        Showing {len(result_sample)} out of {total_results} rows:
        ```json
        {results_str}
        ```

        ## Your Tasks:
        1. Provide a direct answer to the user's question based on the data
        2. Provide a deeper analysis with key insights about the data
        3. Recommend the best visualization type for this data

        ## Visualization Options:
        - "table": For raw data or many columns
        - "bar": For comparing values across categories
        - "line": For time series or trends
        - "pie": For showing proportions of a whole (only for small numbers of categories)

        ## Response Format
        Format your response as JSON with the following structure:
        ```json
        {{
            "natural_language_response": "A direct, concise answer to the question",
            "explanation": "A detailed explanation with insights about the data. Use HTML formatting (<p>, <ul>, <li>, <strong>, etc.) for better readability.",
            "visualization_type": "The suggested visualization type (table, bar, line, or pie)"
        }}
        ```

        Response:
        ```json
        """
        
        return prompt
    
    @staticmethod
    def create_error_analysis_prompt(error_message: str, sql_query: str, schema: Dict[str, Any]) -> str:
        """
        Create a prompt for analyzing and fixing SQL errors
        """
        # Extract column information
        columns_info = "\n".join([
            f"- {col.get('name', '')}: {col.get('type', '')}"
            for col in schema.get("columns", [])
        ])
        
        prompt = f"""
        # SQL Error Analysis Task

        You are an expert PostgreSQL database developer. A SQL query has failed, and you need to analyze the error and provide a fixed query.

        ## Error Message
        ```
        {error_message}
        ```

        ## Original SQL Query
        ```sql
        {sql_query}
        ```

        ## Database Schema
        Table: {schema.get("table_name", "unknown")}
        Columns:
        {columns_info}

        ## Your Task
        1. Analyze the error message and identify the issue in the SQL query
        2. Provide a fixed version of the SQL query that will work in PostgreSQL
        3. Make sure to keep the same intent as the original query

        ## Response Format
        Format your response as JSON with the following structure:
        ```json
        {{
            "error_analysis": "A brief explanation of what went wrong",
            "fixed_query": "The corrected SQL query"
        }}
        ```

        Response:
        ```json
        """
        
        return prompt

    @staticmethod
    def create_sql_regeneration_prompt(
        natural_query: str,
        schema: Dict[str, Any],
        current_sql: Optional[str] = None,
        error_message: Optional[str] = None,
        result_sample: Optional[List[Dict[str, Any]]] = None,
        max_results: int = 5,
    ) -> str:
        """
        Create a prompt for regenerating SQL using context from errors or sample output.
        """
        columns_info = "\n".join([
            f"- {col.get('name', '')}: {col.get('type', '')}"
            for col in schema.get("columns", [])
        ])

        sample = result_sample[:max_results] if result_sample else []
        results_str = json.dumps(sample, indent=2) if sample else "[]"

        current_sql_block = ""
        if current_sql:
            current_sql_block = f"""
        ## Previous SQL Attempt
        ```sql
        {current_sql}
        ```
        """

        error_block = ""
        if error_message:
            error_block = f"""
        ## Database Error
        ```
        {error_message}
        ```
        """

        results_block = ""
        if result_sample:
            results_block = f"""
        ## Sample Output (if query executed)
        ```json
        {results_str}
        ```
        """

        user_block = ""
        if natural_query:
            user_block = f"""
        ## User Question
        "{natural_query}"
        """
        else:
            user_block = """
        ## User Question
        (No natural-language question provided. Infer intent from SQL + schema + error/output.)
        """

        prompt = f"""
        # SQL Regeneration Task

        You are an expert PostgreSQL query generator. The original query needs improvement.
        {user_block}

        ## Database Schema
        Table: {schema.get("table_name", "unknown")}
        Columns:
        {columns_info}
        {current_sql_block}
        {error_block}
        {results_block}

        ## Your Task
        1. Produce a corrected SQL query that answers the user's question
        2. Fix any errors indicated above
        3. Ensure the query is valid PostgreSQL
        4. Return only the SQL query without explanations

        SQL query:
        ```sql
        """

        return prompt

    @staticmethod
    def create_sql_explanation_prompt(
        sql_query: str,
        schema: Dict[str, Any],
        natural_query: Optional[str] = None,
        result_sample: Optional[List[Dict[str, Any]]] = None,
        max_results: int = 5,
    ) -> str:
        """
        Create a prompt for explaining a SQL query.
        """
        columns_info = "\n".join([
            f"- {col.get('name', '')}: {col.get('type', '')}"
            for col in schema.get("columns", [])
        ])

        sample = result_sample[:max_results] if result_sample else []
        results_str = json.dumps(sample, indent=2) if sample else "[]"

        user_block = ""
        if natural_query:
            user_block = f"""
        ## User Question
        "{natural_query}"
        """

        results_block = ""
        if result_sample:
            results_block = f"""
        ## Sample Output (if available)
        ```json
        {results_str}
        ```
        """

        prompt = f"""
        # SQL Explanation Task

        You are an expert SQL analyst. Explain what the query does in clear, concise language.
        {user_block}
        ## SQL Query
        ```sql
        {sql_query}
        ```

        ## Database Schema
        Table: {schema.get("table_name", "unknown")}
        Columns:
        {columns_info}
        {results_block}

        ## Your Task
        1. Explain the SQL logic step-by-step as a numbered list
        2. Summarize the intent in one sentence
        3. Be concise and avoid code blocks or HTML
        4. Use Markdown with the exact structure below

        Use this exact Markdown template:
        ### SQL Explanation
        1. ...
        2. ...
        3. ...

        ### Summary
        One sentence summary.

        Explanation (Markdown only):
        """

        return prompt
    
    @staticmethod
    def create_schema_discovery_prompt(tables: List[str], table_summaries: Dict[str, str]) -> str:
        """
        Create a prompt for discovering relationships and suggesting queries across multiple tables
        """
        tables_info = []
        for table in tables:
            summary = table_summaries.get(table, "No information available")
            tables_info.append(f"### {table}\n{summary}")
        
        tables_str = "\n\n".join(tables_info)
        
        prompt = f"""
        # Database Schema Analysis Task

        You are an expert database architect. Your task is to analyze a PostgreSQL database schema and suggest useful queries that could provide business insights.

        ## Database Tables
        {tables_str}

        ## Your Tasks
        1. Identify potential relationships between tables
        2. Suggest 3-5 insightful business questions that could be answered with this database
        3. For each question, provide the corresponding SQL query

        ## Response Format
        Format your response as JSON with the following structure:
        ```json
        {{
            "identified_relationships": [
                {{
                    "table1": "name of first table",
                    "column1": "column in first table",
                    "table2": "name of second table",
                    "column2": "column in second table",
                    "relationship_type": "one-to-many/many-to-one/etc"
                }}
            ],
            "suggested_questions": [
                {{
                    "question": "What is the total revenue by customer segment?",
                    "business_value": "Helps identify which customer segments are most valuable",
                    "sql_query": "SELECT customer_segment, SUM(revenue) FROM..."
                }}
            ]
        }}
        ```

        Response:
        ```json
        """
        
        return prompt
