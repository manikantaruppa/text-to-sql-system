# main.py - FastAPI Application with PostgreSQL support
from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import pandas as pd
import psycopg2
import psycopg2.extras
from psycopg2 import sql as pg_sql
import os
import json
import httpx
import re
import asyncio
import ast
from contextlib import asynccontextmanager
import logging
import time
from dotenv import load_dotenv
from pathlib import Path
from prompting_service import PromptingService
from schema_analyzer import SchemaAnalyzer
from typing import TYPE_CHECKING

# Load environment variables (explicit project root .env)
_ROOT_ENV = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_ROOT_ENV)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Application settings
class Settings:
    POSTGRES_DB = os.getenv("POSTGRES_DB", "postgres")
    POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_SERVER = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
    
    LOCAL_LLM_ENDPOINT = os.getenv("LOCAL_LLM_ENDPOINT", "http://localhost:8501")
    LLM_TIMEOUT = int(os.getenv("LLM_TIMEOUT", "60"))
    LLM_MAX_TOKENS = int(os.getenv("LLM_MAX_TOKENS", "1024"))
    LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.0"))
    LLM_HEALTH_TTL = int(os.getenv("LLM_HEALTH_TTL", "300"))
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"
    DEFAULT_QUERY_LIMIT = int(os.getenv("DEFAULT_QUERY_LIMIT", "500"))
    STATEMENT_TIMEOUT_MS = int(os.getenv("STATEMENT_TIMEOUT_MS", "5000"))
    
    @property
    def postgres_url(self):
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    @property
    def llm_endpoint(self):
        return f"{self.LOCAL_LLM_ENDPOINT}/v1/completions"

    @property
    def llm_health_endpoint(self):
        return f"{self.LOCAL_LLM_ENDPOINT}/v1/completions"

settings = Settings()

# Simple in-memory cache for LLM health (per process)
_llm_health_cache: Optional[Dict[str, Any]] = None
_llm_health_cache_at: Optional[float] = None

# Database setup
def get_db_connection():
    conn = psycopg2.connect(
        dbname=settings.POSTGRES_DB,
        user=settings.POSTGRES_USER,
        password=settings.POSTGRES_PASSWORD,
        host=settings.POSTGRES_SERVER,
        port=settings.POSTGRES_PORT
    )
    # Set the cursor to return dictionaries
    conn.cursor_factory = psycopg2.extras.RealDictCursor
    return conn

from decimal import Decimal
import json

# Custom JSON encoder to handle Decimal objects
from decimal import Decimal
import json
import datetime
import uuid

# Enhanced Custom JSON encoder to handle complex data types
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, datetime.datetime):
            return obj.isoformat()
        elif isinstance(obj, datetime.date):
            return obj.isoformat()
        elif isinstance(obj, datetime.time):
            return obj.isoformat()
        elif isinstance(obj, uuid.UUID):
            return str(obj)
        elif isinstance(obj, bytes):
            return obj.decode('utf-8', errors='replace')
        elif hasattr(obj, 'to_dict'):
            return obj.to_dict()
        elif hasattr(obj, '__dict__'):
            return obj.__dict__
        try:
            # For numpy types and other specialized types
            return float(obj)
        except (TypeError, ValueError):
            try:
                return str(obj)
            except:
                pass
        return super().default(obj)

# Initialize database on startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create the database tables if they don't exist
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create uploaded_tables table to track uploads
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS uploaded_tables (
            id SERIAL PRIMARY KEY,
            table_name TEXT UNIQUE,
            schema JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS schema_annotations (
            table_name TEXT PRIMARY KEY,
            annotations JSONB,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS query_history (
            id SERIAL PRIMARY KEY,
            table_name TEXT,
            natural_query TEXT,
            sql_query TEXT,
            status TEXT,
            error TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS dashboard_pins (
            id SERIAL PRIMARY KEY,
            table_name TEXT,
            natural_query TEXT,
            sql_query TEXT,
            visualization_type TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        conn.commit()
        conn.close()
        logger.info("Database initialized")
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        logger.error("Backend will start, but DB-dependent endpoints will fail until PostgreSQL is reachable.")
    
    yield
    
    # Cleanup on shutdown if needed
    logger.info("Application shutting down")

# Create FastAPI app
# app = FastAPI(lifespan=lifespan)
# Create FastAPI app with custom JSON encoder
app = FastAPI(
    lifespan=lifespan,
    json_encoder=CustomJSONEncoder
)

# Add CORS middleware
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for frontend (for production use)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Request and response models
class QueryRequest(BaseModel):
    query: str
    table_name: str


class FixRequest(BaseModel):
    natural_query: str
    table_name: str
    error: str


class DrilldownRequest(BaseModel):
    table_name: str
    sql_query: str


class SchemaAnnotationRequest(BaseModel):
    table_name: str
    annotations: Any


class RunSqlRequest(BaseModel):
    table_name: str
    sql_query: str


class RenameTableRequest(BaseModel):
    old_name: str
    new_name: str


class RegenerateSqlRequest(BaseModel):
    natural_query: Optional[str] = None
    table_name: str
    current_sql: Optional[str] = None
    error: Optional[str] = None
    result_sample: Optional[List[Dict[str, Any]]] = None


class ExplainSqlRequest(BaseModel):
    table_name: str
    sql_query: str
    natural_query: Optional[str] = None
    result_sample: Optional[List[Dict[str, Any]]] = None

class QueryResponse(BaseModel):
    natural_language_response: str
    sql_query: str
    data: List[Dict[str, Any]]
    explanation: str
    visualization_type: str
    status: Optional[str] = None
    clarification_questions: Optional[List[str]] = None

# LLM Service for text-to-SQL and analysis
class LLMService:
    def __init__(self):
        self.endpoint = settings.llm_endpoint
        self.timeout = settings.LLM_TIMEOUT
        self.max_tokens = settings.LLM_MAX_TOKENS
        self.temperature = settings.LLM_TEMPERATURE
        self.prompting_service = PromptingService()
        self.gemini_api_key = os.getenv("GOOGLE_API_KEY", "").strip()
    
    async def _call_primary(self, prompt: str) -> str:
        payload = {
            "prompt": prompt,
            "max_tokens": self.max_tokens,
            "temperature": self.temperature
        }
        logger.debug(f"Calling primary LLM with prompt: {prompt[:100]}...")
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.endpoint,
                json=payload,
                timeout=self.timeout
            )
        if response.status_code != 200:
            raise LLMError(detail=f"Primary LLM error: {response.text}")

        try:
            result = response.json()
        except Exception:
            raise LLMError(detail=f"Primary LLM returned non-JSON response: {response.text[:500]}")

        if "choices" not in result or not result["choices"]:
            raise LLMError(detail=f"Primary LLM response missing choices: {json.dumps(result)[:500]}")

        text = str(result["choices"][0].get("text", "")).strip()
        if not text:
            raise LLMError(detail="Primary LLM returned empty text response.")

        return self._clean_llm_response(text)

    def _clean_llm_response(self, text: str) -> str:
        """Clean up LLM response by removing markdown code blocks."""
        # Clean up response formatting
        json_match = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL)
        if json_match:
            text = json_match.group(1).strip()
        sql_match = re.search(r'```sql\s*(.*?)\s*```', text, re.DOTALL)
        if sql_match:
            text = sql_match.group(1).strip()
        code_match = re.search(r'```\s*(.*?)\s*```', text, re.DOTALL)
        if code_match and not json_match and not sql_match:
            potential_json = code_match.group(1).strip()
            if potential_json.startswith('{') or potential_json.startswith('['):
                text = potential_json
            else:
                # For SQL or other code without language tag
                text = code_match.group(1).strip()
        return text

    async def _call_gemini_fallback(self, prompt: str) -> str:
        if not self.gemini_api_key:
            raise LLMError(detail="Gemini fallback unavailable: GOOGLE_API_KEY not set.")
        try:
            from google import genai  # type: ignore
            from google.genai import types  # type: ignore
            client = genai.Client(api_key=self.gemini_api_key)
            # Try different Gemini models - use full model path with "models/" prefix
            # Multiple fallbacks to handle quota exhaustion on free tier
            # Tested and verified working models first, then fallbacks
            models_to_try = [
                # Currently working (tested)
                "models/gemini-2.5-flash-lite",
                "models/gemini-flash-latest",
                "models/gemini-flash-lite-latest",
                "models/gemini-2.5-flash-preview-09-2025",
                "models/gemini-2.5-flash-lite-preview-09-2025",
                # Fallbacks (may have quota issues)
                "models/gemini-2.5-flash",
                "models/gemini-2.0-flash",
                "models/gemini-2.0-flash-lite",
                "models/gemini-2.5-pro",
                "models/gemini-pro-latest",
            ]
            last_error = None
            for model_name in models_to_try:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            max_output_tokens=self.max_tokens,
                            temperature=self.temperature,
                        ),
                    )
                    text = (response.text or "").strip()
                    if text:
                        logger.info(f"Gemini model {model_name} responded successfully")
                        return self._clean_llm_response(text)
                except Exception as model_err:
                    logger.warning(f"Gemini model {model_name} failed: {str(model_err)}")
                    last_error = model_err
                    continue
            raise LLMError(detail=f"All Gemini models failed. Last error: {last_error}")
        except ImportError as e:
            raise LLMError(detail=f"Gemini package not properly installed: {str(e)}. Run: pip install google-genai")
        except Exception as e:
            raise LLMError(detail=f"Gemini API error: {str(e)}")

    async def call_llm(self, prompt: str) -> str:
        """
        Call the language model API with fallback to Gemini.
        """
        try:
            return await self._call_primary(prompt)
        except Exception as primary_err:
            logger.error(f"Primary LLM failed: {str(primary_err)}")
            try:
                return await self._call_gemini_fallback(prompt)
            except Exception as fallback_err:
                logger.error(f"Gemini fallback failed: {str(fallback_err)}")
                raise LLMError(detail=f"LLM failed. Primary: {primary_err}. Fallback: {fallback_err}")
    
    async def generate_sql(self, natural_query: str, table_schema: dict) -> str:
        """
        Convert natural language query to SQL using the LLM
        """
        try:
            # Create a prompt using the prompting service
            prompt = self.prompting_service.create_text_to_sql_prompt(natural_query, table_schema)
            
            # Add PostgreSQL specific instructions
            prompt += "\nMake sure the SQL is compatible with PostgreSQL."
            
            # Call the LLM to generate SQL
            sql_query = await self.call_llm(prompt)
            
            # Clean up the query
            sql_query = sql_query.strip()
            
            logger.info(f"Generated SQL: {sql_query}")
            return sql_query
        
        except Exception as e:
            logger.error(f"Error generating SQL: {str(e)}")
            raise LLMError(detail=f"Failed to generate SQL: {str(e)}")
    
    async def analyze_results(self, natural_query: str, sql_query: str, results: List[Dict], table_schema: dict) -> Dict:
        """
        Analyze the SQL results using the LLM and provide natural language explanation
        """
        try:
            # Limit the results to prevent token overflow
            max_results = 5  # Define max_results here with a default value
            result_sample = results[:max_results] if results else []
            total_results = len(results) if results else 0
            
            # Convert Decimal objects to float for JSON serialization
            # This creates a deep copy of the results with Decimal converted to float
            serializable_results = json.loads(json.dumps(results, cls=CustomJSONEncoder))
            
            # Format the results for better readability
            results_str = json.dumps(serializable_results[:max_results], indent=2)
            
            # Extract schema information
            columns_info = "\n".join([
                f"- {col.get('name', '')}: {col.get('type', '')}"
                for col in table_schema.get("columns", [])
            ])
            
            prompt = self.prompting_service.create_analysis_prompt(
                natural_query, 
                sql_query, 
                table_schema, 
                serializable_results,
                max_results=max_results  # Pass max_results here
            )
            
            # Call the LLM to analyze the results
            analysis_text = await self.call_llm(prompt)
            
            # Parse the response as JSON
            analysis = _parse_llm_json(analysis_text)
            if isinstance(analysis, dict):
                # Ensure the required fields are present
                required_fields = ["natural_language_response", "explanation", "visualization_type"]
                for field in required_fields:
                    if field not in analysis:
                        analysis[field] = ""
                return analysis

            # If we can't parse as JSON, return a minimal fallback response
            logger.error(f"Error parsing LLM response as JSON: {analysis_text}")
            row_count = len(serializable_results) if serializable_results else 0
            column_names = list(serializable_results[0].keys()) if row_count else []
            summary = "Query executed successfully."
            if row_count:
                summary = f"Returned {row_count} rows."
                if column_names:
                    summary += f" Columns: {', '.join(column_names[:6])}."
            return {
                "natural_language_response": summary,
                "explanation": "",
                "visualization_type": _infer_visualization_type(serializable_results, table_schema)
            }
        
        except Exception as e:
            logger.error(f"Error analyzing results: {str(e)}")
            raise LLMError(detail=f"Failed to analyze results: {str(e)}")

    async def fix_sql_error(self, error_message: str, sql_query: str, table_schema: dict) -> Dict[str, str]:
        """
        Ask the LLM to analyze and fix a SQL error.
        """
        try:
            prompt = self.prompting_service.create_error_analysis_prompt(error_message, sql_query, table_schema)
            fix_text = await self.call_llm(prompt)
            try:
                fix = json.loads(fix_text)
                return {
                    "error_analysis": fix.get("error_analysis", ""),
                    "fixed_query": fix.get("fixed_query", "")
                }
            except json.JSONDecodeError:
                logger.error(f"Error parsing LLM fix response as JSON: {fix_text}")
                return {"error_analysis": "Failed to parse fix response", "fixed_query": ""}
        except Exception as e:
            logger.error(f"Error fixing SQL: {str(e)}")
            return {"error_analysis": str(e), "fixed_query": ""}

    async def regenerate_sql(
        self,
        natural_query: str,
        table_schema: dict,
        current_sql: Optional[str] = None,
        error_message: Optional[str] = None,
        result_sample: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        """
        Regenerate SQL using context from errors or sample output.
        """
        try:
            prompt = self.prompting_service.create_sql_regeneration_prompt(
                natural_query=natural_query,
                schema=table_schema,
                current_sql=current_sql,
                error_message=error_message,
                result_sample=result_sample,
            )
            prompt += "\nMake sure the SQL is compatible with PostgreSQL."
            sql_query = await self.call_llm(prompt)
            sql_query = sql_query.strip()
            logger.info(f"Regenerated SQL: {sql_query}")
            return sql_query
        except Exception as e:
            logger.error(f"Error regenerating SQL: {str(e)}")
            raise LLMError(detail=f"Failed to regenerate SQL: {str(e)}")

    async def explain_sql(
        self,
        sql_query: str,
        table_schema: dict,
        natural_query: Optional[str] = None,
        result_sample: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        """
        Explain a SQL query in natural language.
        """
        try:
            prompt = self.prompting_service.create_sql_explanation_prompt(
                sql_query=sql_query,
                schema=table_schema,
                natural_query=natural_query,
                result_sample=result_sample,
            )
            explanation = await self.call_llm(prompt)
            explanation = _normalize_markdown(explanation)
            logger.info("Generated SQL explanation.")
            return explanation
        except Exception as e:
            logger.error(f"Error explaining SQL: {str(e)}")
            raise LLMError(detail=f"Failed to explain SQL: {str(e)}")

# Custom exception class
class LLMError(Exception):
    def __init__(self, detail: str):
        self.detail = detail


# Data service for handling CSV and database operations
class DataService:
    def __init__(self):
        pass
    async def process_csv(self, file_content: bytes, table_name: str) -> dict:
        """
        Process a CSV file and store it in the PostgreSQL database
        """
        try:
            # Step 1: Check file content
            logger.info("STEP 1: Checking file content")
            if not file_content:
                logger.error("File content is empty")
                raise ValueError("Uploaded file is empty")
            
            logger.info(f"File content size: {len(file_content)} bytes")
            logger.info(f"First 100 bytes: {file_content[:100]}")
            
            # Step 2: Parse CSV with pandas
            logger.info("STEP 2: Parsing CSV with pandas")
            try:
                # First, convert bytes to string to check content
                file_text = file_content.decode('utf-8', errors='replace')
                logger.info(f"CSV text preview: {file_text[:200]}")
                
                # Now parse with pandas
                df = pd.read_csv(
                    pd.io.common.BytesIO(file_content),
                    keep_default_na=True,
                    na_values=['', '#N/A', '#N/A N/A', '#NA', '-1.#IND', '-1.#QNAN', 
                            '-NaN', '-nan', '1.#IND', '1.#QNAN', '<NA>', 'N/A', 
                            'NA', 'NULL', 'NaN', 'n/a', 'nan', 'null'],
                    skip_blank_lines=True
                )
                
                logger.info(f"DataFrame created successfully with shape: {df.shape}")
            except Exception as e:
                logger.error(f"Failed to parse CSV: {str(e)}")
                raise ValueError(f"Failed to parse CSV file: {str(e)}")
            
            # Step 3: Check dataframe
            logger.info("STEP 3: Checking dataframe")
            if df.empty:
                logger.error("DataFrame is empty")
                raise ValueError("CSV file contains no data")
            
            logger.info(f"Column names: {df.columns.tolist()}")
            logger.info(f"Data types: {df.dtypes.to_dict()}")
            
            # Step 4: Clean column names
            logger.info("STEP 4: Cleaning column names")
            original_columns = df.columns.tolist()
            cleaned_columns = []
            
            for col in original_columns:
                # Replace spaces and special characters with underscores
                cleaned_col = re.sub(r'[^\w]', '_', str(col))
                
                # Ensure column name doesn't start with a number
                if cleaned_col and cleaned_col[0].isdigit():
                    cleaned_col = 'col_' + cleaned_col
                    
                # Avoid duplicate column names
                counter = 1
                base_col = cleaned_col
                while cleaned_col in cleaned_columns:
                    cleaned_col = f"{base_col}_{counter}"
                    counter += 1
                    
                cleaned_columns.append(cleaned_col)
            
            logger.info(f"Original columns: {original_columns}")
            logger.info(f"Cleaned columns: {cleaned_columns}")
            
            # Rename columns if needed
            if original_columns != cleaned_columns:
                column_mapping = {original: cleaned for original, cleaned in zip(original_columns, cleaned_columns)}
                df = df.rename(columns=column_mapping)
                logger.info(f"Renamed columns: {column_mapping}")
            
            # Step 5: Connect to database
            logger.info("STEP 5: Connecting to database")
            try:
                conn = get_db_connection()
                logger.info("Database connection established")
            except Exception as e:
                logger.error(f"Database connection failed: {str(e)}")
                raise ValueError(f"Failed to connect to database: {str(e)}")
            
            try:
                # Step 6: Check if table exists
                logger.info("STEP 6: Checking if table exists")
                cursor = conn.cursor()
                cursor.execute(f"SELECT to_regclass('public.{table_name}')")
                exists_result = cursor.fetchone()
                logger.info(f"Table existence check result: {exists_result}")
                
                # FIXED: Access the result using the column name instead of index
                if exists_result and exists_result['to_regclass'] is not None:
                    logger.info(f"Table '{table_name}' exists, dropping it")
                    cursor.execute(f"DROP TABLE IF EXISTS {table_name}")
                    conn.commit()
                
                # Step 7: Create PostgreSQL table
                logger.info("STEP 7: Creating PostgreSQL table")
                pg_dtype_map = {
                    'int64': 'INTEGER',
                    'int32': 'INTEGER',
                    'float64': 'FLOAT',
                    'float32': 'FLOAT',
                    'bool': 'BOOLEAN',
                    'datetime64[ns]': 'TIMESTAMP',
                    'timedelta64[ns]': 'INTERVAL',
                    'object': 'TEXT',
                    'category': 'TEXT'
                }
                
                columns = []
                for col in df.columns:
                    dtype = str(df[col].dtype)
                    pg_type = pg_dtype_map.get(dtype, 'TEXT')
                    columns.append(f'"{col}" {pg_type}')
                
                create_table_sql = f"CREATE TABLE {table_name} ({', '.join(columns)})"
                logger.info(f"Create table SQL: {create_table_sql}")
                
                try:
                    cursor.execute(create_table_sql)
                    conn.commit()
                    logger.info("Table created successfully")
                except Exception as e:
                    logger.error(f"Failed to create table: {str(e)}")
                    conn.rollback()
                    raise ValueError(f"Failed to create table: {str(e)}")
                
                # Step 8: Insert data
                logger.info("STEP 8: Inserting data")
                rows_inserted = 0
                
                try:
                    for _, row in df.iterrows():
                        placeholders = ', '.join(['%s'] * len(row))
                        columns_str = ', '.join([f'"{col}"' for col in df.columns])
                        insert_sql = f"INSERT INTO {table_name} ({columns_str}) VALUES ({placeholders})"
                        
                        # Handle NaN values by converting to None (NULL in SQL)
                        values = [None if pd.isna(val) else val for val in row]
                        
                        cursor.execute(insert_sql, values)
                        rows_inserted += 1
                        
                        # Log progress for large files
                        if rows_inserted % 1000 == 0:
                            logger.info(f"Inserted {rows_inserted} rows so far")
                    
                    conn.commit()
                    logger.info(f"Successfully inserted {rows_inserted} rows")
                except Exception as e:
                    logger.error(f"Failed to insert data: {str(e)}")
                    conn.rollback()
                    raise ValueError(f"Failed to insert data: {str(e)}")
                
                # Step 9: Analyze schema
                logger.info("STEP 9: Analyzing schema")
                try:
                    analyzer = SchemaAnalyzer(conn)
                    detailed_schema = analyzer.analyze_table(table_name)
                    logger.info("Schema analysis completed successfully")
                except Exception as e:
                    logger.error(f"Schema analysis failed: {str(e)}")
                    raise ValueError(f"Schema analysis failed: {str(e)}")
                
                # Step 10: Save schema to uploaded_tables
                logger.info("STEP 10: Saving schema to uploaded_tables")
                try:
                    json_schema = json.dumps(detailed_schema)
                    logger.info(f"Schema JSON length: {len(json_schema)}")
                    
                    cursor.execute(
                        "INSERT INTO uploaded_tables (table_name, schema) VALUES (%s, %s) ON CONFLICT (table_name) DO UPDATE SET schema = EXCLUDED.schema",
                        (table_name, json_schema)
                    )
                    conn.commit()
                    logger.info("Schema saved to uploaded_tables")
                except Exception as e:
                    logger.error(f"Failed to save schema: {str(e)}")
                    conn.rollback()
                    raise ValueError(f"Failed to save schema to uploaded_tables: {str(e)}")
                
                logger.info(f"CSV processing completed successfully for table: {table_name}")
                return detailed_schema
                
            except Exception as e:
                logger.error(f"Error during database operations: {str(e)}")
                try:
                    conn.rollback()
                except:
                    pass
                raise ValueError(f"Database error: {str(e)}")
            finally:
                try:
                    conn.close()
                    logger.info("Database connection closed")
                except:
                    logger.warning("Failed to close database connection")
        
        except ValueError as e:
            # Re-raise with the same message for propagation
            logger.error(f"ValueError in process_csv: {str(e)}")
            raise ValueError(str(e))
        except Exception as e:
            logger.error(f"Unexpected error in process_csv: {str(e)}", exc_info=True)
            raise ValueError(f"Unexpected error: {str(e)}")
    async def execute_query(self, sql_query: str) -> List[Dict]:
        """
        Execute SQL query and return results
        """
        try:
            conn = get_db_connection()
            try:
                # Execute the query
                cursor = conn.cursor()
                # Enforce read-only, timeouts, and public schema
                cursor.execute("SET search_path TO public")
                cursor.execute("SET statement_timeout = %s", (settings.STATEMENT_TIMEOUT_MS,))
                cursor.execute("SET idle_in_transaction_session_timeout = %s", (settings.STATEMENT_TIMEOUT_MS,))
                cursor.execute("SET TRANSACTION READ ONLY")
                cursor.execute(sql_query)
                
                # Fetch the results
                rows = cursor.fetchall()
                
                # RealDictCursor already returns dictionaries
                results = list(rows)
                
                logger.info(f"Executed SQL query: {sql_query[:100]}")
                logger.info(f"Query returned {len(results)} rows")
                
                return results
            
            finally:
                conn.close()
        
        except Exception as e:
            logger.error(f"Error executing SQL query: {str(e)}")
            raise HTTPException(status_code=400, detail=f"SQL Error: {str(e)}")

    async def get_table_schema(self, table_name: str) -> dict:
        """
        Get the schema for a specific table
        """
        try:
            conn = get_db_connection()
            try:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT schema FROM uploaded_tables WHERE table_name = %s",
                    (table_name,)
                )
                result = cursor.fetchone()

                if not result:
                    logger.error(f"Table '{table_name}' not found")
                    raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found")

                schema = result["schema"]
                return schema

            finally:
                conn.close()

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting table schema: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error getting table schema: {str(e)}")

    async def get_table_schema_raw(self, table_name: str) -> dict:
        """
        Return raw schema JSON for a table (used by schema editor).
        """
        schema = await self.get_table_schema(table_name)
        if isinstance(schema, str):
            try:
                return json.loads(schema)
            except Exception:
                return {}
        return schema

    async def save_schema_annotations(self, table_name: str, annotations: List[Dict[str, Any]]) -> None:
        try:
            conn = get_db_connection()
            try:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    INSERT INTO schema_annotations (table_name, annotations, updated_at)
                    VALUES (%s, %s, CURRENT_TIMESTAMP)
                    ON CONFLICT (table_name) DO UPDATE SET
                        annotations = EXCLUDED.annotations,
                        updated_at = CURRENT_TIMESTAMP
                    """,
                    (table_name, json.dumps(annotations))
                )
                conn.commit()
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Error saving schema annotations: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error saving annotations: {str(e)}")

    async def get_schema_annotations(self, table_name: str) -> Dict[str, Any]:
        try:
            conn = get_db_connection()
            try:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT annotations FROM schema_annotations WHERE table_name = %s",
                    (table_name,)
                )
                result = cursor.fetchone()
                if not result:
                    return {"columns": [], "aliases": [], "metrics": []}
                annotations = result.get("annotations")
                if isinstance(annotations, str):
                    annotations = json.loads(annotations)
                if isinstance(annotations, list):
                    return {"columns": annotations, "aliases": [], "metrics": []}
                if isinstance(annotations, dict):
                    annotations.setdefault("columns", [])
                    annotations.setdefault("aliases", [])
                    annotations.setdefault("metrics", [])
                    return annotations
                return {"columns": [], "aliases": [], "metrics": []}
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Error fetching schema annotations: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error fetching annotations: {str(e)}")

    async def log_query_history(self, table_name: str, natural_query: str, sql_query: str, status: str, error: Optional[str] = None) -> None:
        try:
            conn = get_db_connection()
            try:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    INSERT INTO query_history (table_name, natural_query, sql_query, status, error)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (table_name, natural_query, sql_query, status, error)
                )
                conn.commit()
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Error logging query history: {str(e)}")

    async def rename_table(self, old_name: str, new_name: str) -> None:
        if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', old_name):
            raise HTTPException(status_code=400, detail="Invalid old table name.")
        if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', new_name):
            raise HTTPException(status_code=400, detail="Invalid new table name.")
        if old_name == new_name:
            return
        try:
            conn = get_db_connection()
            try:
                cursor = conn.cursor()
                # Rename actual table
                cursor.execute(
                    pg_sql.SQL("ALTER TABLE {} RENAME TO {}")
                    .format(pg_sql.Identifier(old_name), pg_sql.Identifier(new_name))
                )
                # Update metadata tables
                cursor.execute(
                    "UPDATE uploaded_tables SET table_name = %s WHERE table_name = %s",
                    (new_name, old_name)
                )
                cursor.execute(
                    "UPDATE schema_annotations SET table_name = %s WHERE table_name = %s",
                    (new_name, old_name)
                )
                cursor.execute(
                    "UPDATE query_history SET table_name = %s WHERE table_name = %s",
                    (new_name, old_name)
                )
                cursor.execute(
                    "UPDATE dashboard_pins SET table_name = %s WHERE table_name = %s",
                    (new_name, old_name)
                )
                conn.commit()
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Error renaming table: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error renaming table: {str(e)}")

    async def get_query_history(self, limit: int = 20) -> List[Dict[str, Any]]:
        try:
            conn = get_db_connection()
            try:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT * FROM query_history ORDER BY created_at DESC LIMIT %s",
                    (limit,)
                )
                return list(cursor.fetchall())
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Error fetching query history: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error fetching history: {str(e)}")

    async def pin_dashboard(self, table_name: str, natural_query: str, sql_query: str, visualization_type: str) -> None:
        try:
            conn = get_db_connection()
            try:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    INSERT INTO dashboard_pins (table_name, natural_query, sql_query, visualization_type)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (table_name, natural_query, sql_query, visualization_type)
                )
                conn.commit()
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Error pinning dashboard: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error pinning dashboard: {str(e)}")

    async def get_dashboard_pins(self) -> List[Dict[str, Any]]:
        try:
            conn = get_db_connection()
            try:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM dashboard_pins ORDER BY created_at DESC")
                return list(cursor.fetchall())
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Error fetching dashboard pins: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error fetching dashboard pins: {str(e)}")


def _contains_sql_comments(sql: str) -> bool:
    return bool(re.search(r'--|/\*|\*/', sql))


def _sanitize_sql(sql: str) -> str:
    sql = sql.strip()
    sql = re.sub(r'^\s*(sql\s*query|sql)\s*:\s*', '', sql, flags=re.IGNORECASE)
    lines = sql.splitlines()
    for idx, line in enumerate(lines):
        if re.match(r'^\s*(with|select)\b', line, flags=re.IGNORECASE):
            sql = "\n".join(lines[idx:]).strip()
            break
    sql = re.sub(r';\s*$', '', sql).strip()
    return sql


def _normalize_markdown(text: str) -> str:
    cleaned = text.strip()
    if not cleaned:
        return cleaned
    cleaned = re.sub(r'```(?:\w+)?\s*([\s\S]*?)\s*```', r'\1', cleaned)
    cleaned = cleaned.replace("\r\n", "\n").replace("\r", "\n")
    cleaned = re.sub(r'(#{2,6})(\S)', r'\1 \2', cleaned)
    cleaned = re.sub(r'(?<!\n)(#{2,6}\s+)', r'\n\1', cleaned)
    cleaned = re.sub(r'(#{2,6}.*)(\n(?!\n))', r'\1\n\n', cleaned)
    cleaned = re.sub(r'(?<!\n)(\d+\.\s+)', r'\n\1', cleaned)
    cleaned = re.sub(r'(?<!\n)([-*]\s+)', r'\n\1', cleaned)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    return cleaned.strip()


def _is_safe_select_only(sql: str) -> bool:
    sql_lower = sql.strip().lower()
    if ";" in sql_lower:
        return False
    if _contains_sql_comments(sql_lower):
        return False
    if not re.match(r'^\s*(with\b|select\b)', sql_lower):
        return False
    forbidden = [
        "insert", "update", "delete", "drop", "alter", "create", "truncate",
        "grant", "revoke", "vacuum", "analyze", "explain", "execute", "merge",
        "call", "copy", "set", "show", "refresh", "load", "do", "begin",
        "commit", "rollback"
    ]
    if re.search(r'\b(' + "|".join(forbidden) + r')\b', sql_lower):
        return False
    return True


def _enforce_limit(sql: str, default_limit: int) -> str:
    if re.search(r'\blimit\b', sql, flags=re.IGNORECASE):
        return sql
    return f"{sql.strip()} LIMIT {default_limit}"


def _validate_identifiers(sql: str, table_schema: dict) -> None:
    table_name = table_schema.get("table_name", "")
    column_names = {col.get("name", "") for col in table_schema.get("columns", [])}
    allowed_identifiers = set(column_names)
    allowed_identifiers.add(table_name)

    # Validate FROM/JOIN table usage
    table_refs = re.findall(r'\b(from|join)\s+"([^"]+)"', sql, flags=re.IGNORECASE)
    for _, tbl in table_refs:
        if tbl != table_name:
            raise HTTPException(status_code=400, detail=f"Unsafe table reference: {tbl}")

    # Allow quoted aliases if declared with AS
    alias_identifiers = set(re.findall(r'\bas\s+"([^"]+)"', sql, flags=re.IGNORECASE))

    # Validate quoted identifiers
    quoted_identifiers = re.findall(r'"([^"]+)"', sql)
    for ident in quoted_identifiers:
        if ident in allowed_identifiers or ident in alias_identifiers:
            continue
        raise HTTPException(status_code=400, detail=f"Unknown or unsafe identifier: {ident}")


def _extract_json_candidate(text: str) -> str:
    json_match = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL | re.IGNORECASE)
    if json_match:
        return json_match.group(1).strip()
    code_match = re.search(r'```\s*(.*?)\s*```', text, re.DOTALL)
    if code_match:
        candidate = code_match.group(1).strip()
        if candidate.startswith("{") or candidate.startswith("["):
            return candidate
    brace_match = re.search(r'(\{.*\})', text, re.DOTALL)
    if brace_match:
        return brace_match.group(1).strip()
    bracket_match = re.search(r'(\[.*\])', text, re.DOTALL)
    if bracket_match:
        return bracket_match.group(1).strip()
    return text.strip()


def _parse_llm_json(text: str) -> Optional[Dict[str, Any]]:
    candidate = _extract_json_candidate(text)
    try:
        parsed = json.loads(candidate)
        if isinstance(parsed, dict):
            return parsed
        return None
    except Exception:
        try:
            parsed = ast.literal_eval(candidate)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            return None
    return None


def _infer_visualization_type(results: List[Dict[str, Any]], table_schema: dict) -> str:
    if not results:
        return "table"
    first_row = results[0]
    if not isinstance(first_row, dict):
        return "table"

    columns = table_schema.get("columns", [])
    type_map = {str(col.get("name", "")): str(col.get("type", "")).lower() for col in columns}

    def is_numeric(col_name: str) -> bool:
        col_type = type_map.get(col_name, "")
        return any(token in col_type for token in ["int", "float", "numeric", "decimal", "double", "real"])

    def is_time(col_name: str) -> bool:
        col_type = type_map.get(col_name, "")
        return any(token in col_type for token in ["date", "time", "timestamp"])

    numeric_cols = [col for col in first_row.keys() if is_numeric(col)]
    time_cols = [col for col in first_row.keys() if is_time(col)]
    non_numeric_cols = [col for col in first_row.keys() if col not in numeric_cols]

    if numeric_cols and time_cols:
        return "line"
    if len(numeric_cols) == 1 and len(non_numeric_cols) >= 1:
        return "bar"
    return "table"


def validate_and_prepare_sql(sql_query: str, table_schema: dict) -> str:
    sql_query = _sanitize_sql(sql_query)
    if not _is_safe_select_only(sql_query):
        raise HTTPException(status_code=400, detail="Unsafe SQL detected. Only SELECT queries are allowed.")
    _validate_identifiers(sql_query, table_schema)
    return _enforce_limit(sql_query, settings.DEFAULT_QUERY_LIMIT)


async def _get_schema_with_annotations(table_name: str, data_service: "DataService") -> dict:
    schema = await data_service.get_table_schema(table_name)
    annotations = await data_service.get_schema_annotations(table_name)
    if isinstance(schema, str):
        try:
            schema = json.loads(schema)
        except Exception:
            schema = {}
    schema = schema or {}
    schema["annotations"] = annotations
    return schema


def _detect_clarification_questions(query: str, table_schema: dict) -> List[str]:
    """
    Lightweight heuristic to detect ambiguous queries and ask 1-2 clarifying questions.
    """
    questions: List[str] = []
    q = query.lower()

    columns = table_schema.get("columns", [])
    column_names = [str(col.get("name", "")).strip() for col in columns]
    column_names_lower = [name.lower() for name in column_names]

    date_like = [
        col.get("name", "") for col in columns
        if "date" in str(col.get("type", "")).lower()
        or "time" in str(col.get("type", "")).lower()
        or "timestamp" in str(col.get("type", "")).lower()
    ]
    numeric_like = [
        col.get("name", "") for col in columns
        if any(tok in str(col.get("type", "")).lower() for tok in ["int", "float", "numeric", "decimal", "double", "real"])
    ]
    id_like = [
        col.get("name", "") for col in columns
        if "id" in str(col.get("name", "")).lower()
    ]

    time_terms = ["last", "this", "previous", "next", "year", "month", "week", "quarter", "today", "yesterday", "between", "from", "to", "date"]
    metric_terms = ["sales", "revenue", "amount", "total", "profit", "cost", "price", "value"]

    mentions_column = any(name in q for name in column_names_lower if name)

    if any(term in q for term in time_terms) and len(date_like) > 1:
        questions.append(
            f"Which date column should I use? Options: {', '.join(date_like[:6])}."
        )

    if any(term in q for term in metric_terms) and len(numeric_like) > 1 and not mentions_column:
        questions.append(
            f"Which metric column should I use? Options: {', '.join(numeric_like[:6])}."
        )

    if ("count" in q or "number of" in q) and len(id_like) > 1 and not mentions_column:
        questions.append(
            f"Which identifier should I count? Options: {', '.join(id_like[:6])}."
        )

    return questions[:2]


# Dependency injections
def get_llm_service():
    return LLMService()

def get_data_service():
    return DataService()


# API endpoints
@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    table_name: str = Form(...),
    data_service: DataService = Depends(get_data_service)
):
    """
    Upload and process a CSV file
    """
    logger.info(f"Received upload request for file: {file.filename}, table: {table_name}")
    
    try:
        # Validate table name
        if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', table_name):
            msg = "Invalid table name. Use only letters, numbers, and underscores. Must start with a letter or underscore."
            logger.error(f"Invalid table name '{table_name}': {msg}")
            raise HTTPException(status_code=400, detail=msg)
            
        # Check file extension
        if not file.filename.lower().endswith('.csv'):
            msg = "Only CSV files are supported"
            logger.error(f"Invalid file type: {file.filename}")
            raise HTTPException(status_code=400, detail=msg)
        
        # Read the file content
        logger.info("Reading file content")
        file_content = await file.read()
        
        if not file_content:
            msg = "Uploaded file is empty"
            logger.error(msg)
            raise HTTPException(status_code=400, detail=msg)
        
        logger.info(f"File content read successfully, size: {len(file_content)} bytes")
        
        # Process the CSV
        logger.info("Processing CSV file")
        try:
            schema = await data_service.process_csv(file_content, table_name)
            logger.info("CSV processed successfully")
            
            return {
                "message": "File uploaded and processed successfully",
                "table_name": table_name,
                "schema": schema
            }
        except ValueError as e:
            logger.error(f"CSV processing error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error processing CSV: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error processing CSV: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
            
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unhandled exception in upload_file: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")
    
@app.post("/api/query", response_model=QueryResponse)
async def process_query(
    request: QueryRequest,
    llm_service: LLMService = Depends(get_llm_service),
    data_service: DataService = Depends(get_data_service)
):
    """
    Process a natural language query and return the results
    """
    try:
        # Get the table schema
        schema = await _get_schema_with_annotations(request.table_name, data_service)

        # Check for ambiguity before LLM call
        clarification_questions = _detect_clarification_questions(request.query, schema)
        if clarification_questions:
            await data_service.log_query_history(request.table_name, request.query, "", "clarify")
            return QueryResponse(
                natural_language_response="I need a bit more detail to answer precisely.",
                sql_query="",
                data=[],
                explanation="",
                visualization_type="table",
                status="clarify",
                clarification_questions=clarification_questions,
            )

        # Generate SQL from natural language
        try:
            sql_query = await llm_service.generate_sql(request.query, schema)
        except Exception as e:
            detail = str(e).strip() or "LLM failed to generate SQL."
            logger.error(f"SQL generation error: {detail}")
            await data_service.log_query_history(request.table_name, request.query, "", "error", detail)
            raise HTTPException(status_code=500, detail=detail)

        # Validate and enforce safety checks
        sql_query = validate_and_prepare_sql(sql_query, schema)
        
        # Execute the SQL query
        try:
            results = await data_service.execute_query(sql_query)
        except HTTPException as exec_err:
            # Attempt a single safe repair using the LLM
            fix = await llm_service.fix_sql_error(exec_err.detail, sql_query, schema)
            fixed_query = fix.get("fixed_query", "").strip()
            if fixed_query:
                fixed_query = validate_and_prepare_sql(fixed_query, schema)
                results = await data_service.execute_query(fixed_query)
                sql_query = fixed_query
            else:
                await data_service.log_query_history(request.table_name, request.query, sql_query, "error", exec_err.detail)
                raise
        
        # Convert Decimal objects to float for JSON serialization
        serializable_results = json.loads(json.dumps(results, cls=CustomJSONEncoder))
        
        # Analyze the results
        analysis = await llm_service.analyze_results(request.query, sql_query, results, schema)
        
        # Prepare the response
        response = QueryResponse(
            natural_language_response=analysis["natural_language_response"],
            sql_query=sql_query,
            data=serializable_results,  # Use the serializable results here
            explanation=analysis["explanation"],
            visualization_type=analysis["visualization_type"]
        )
        
        await data_service.log_query_history(request.table_name, request.query, sql_query, "success")
        return response
        
    except Exception as e:
        logger.error(f"Error in process_query: {str(e)}")
        if isinstance(e, HTTPException):
            raise
        detail = str(e).strip() or "Unexpected server error."
        raise HTTPException(status_code=500, detail=detail)

# Root endpoint that serves the frontend
@app.get("/")
async def read_root():
    return {"message": "Text-to-SQL API is running"}


# Health check endpoint
@app.get("/api/health")
async def health_check():
    try:
        # Test database connection
        conn = get_db_connection()
        conn.cursor().execute("SELECT 1")
        conn.close()
        
        return {
            "status": "ok", 
            "version": "1.0.0",
            "database": "connected",
            "postgresql_version": os.getenv("POSTGRES_VERSION", "Unknown")
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }


@app.get("/api/llm/health")
async def llm_health_check():
    """
    Check primary LLM endpoint health and fallback availability.
    Uses a lightweight ping and caches results to avoid LLM calls.
    """
    global _llm_health_cache, _llm_health_cache_at
    now = time.time()
    if _llm_health_cache and _llm_health_cache_at:
        if now - _llm_health_cache_at < settings.LLM_HEALTH_TTL:
            return _llm_health_cache

    primary_status = {"status": "unknown", "message": ""}
    fallback_status = {"status": "unknown", "message": ""}
    # Primary LLM endpoint (lightweight ping, no model invocation)
    try:
        base_url = settings.LOCAL_LLM_ENDPOINT.rstrip("/") + "/"
        async with httpx.AsyncClient(timeout=2) as client:
            resp = await client.get(base_url)
        if resp.status_code == 200:
            primary_status = {"status": "ok", "message": "reachable"}
        else:
            primary_status = {"status": "error", "message": f"HTTP {resp.status_code}"}
    except Exception as e:
        primary_status = {"status": "error", "message": str(e)}

    # Fallback availability (Gemini API key presence)
    if os.getenv("GOOGLE_API_KEY", "").strip():
        fallback_status = {"status": "ok", "message": "api_key_set"}
    else:
        fallback_status = {"status": "error", "message": "missing GOOGLE_API_KEY"}

    result = {"primary": primary_status, "fallback": fallback_status}
    _llm_health_cache = result
    _llm_health_cache_at = now
    return result


@app.get("/api/llm/test")
async def llm_test():
    """
    Actually test the LLM by making a simple call.
    This helps diagnose if the API key is valid and working.
    """
    llm_service = LLMService()

    # Test primary LLM
    primary_result = {"status": "error", "message": ""}
    try:
        response = await llm_service._call_primary("Say 'hello' in one word.")
        primary_result = {"status": "ok", "response": response[:100]}
    except Exception as e:
        primary_result = {"status": "error", "message": str(e)}

    # Test Gemini fallback
    fallback_result = {"status": "error", "message": ""}
    try:
        if not llm_service.gemini_api_key:
            fallback_result = {"status": "error", "message": "GOOGLE_API_KEY not set in environment"}
        else:
            response = await llm_service._call_gemini_fallback("Say 'hello' in one word.")
            fallback_result = {"status": "ok", "response": response[:100]}
    except Exception as e:
        error_msg = str(e)
        # Provide more helpful error messages
        if "API_KEY_INVALID" in error_msg or "invalid" in error_msg.lower():
            fallback_result = {"status": "error", "message": "Invalid API key. Please check your GOOGLE_API_KEY."}
        elif "quota" in error_msg.lower():
            fallback_result = {"status": "error", "message": "API quota exceeded. Check your Google Cloud billing."}
        elif "not found" in error_msg.lower() or "404" in error_msg:
            fallback_result = {"status": "error", "message": "Model not found. Try using 'gemini-1.5-flash' instead."}
        else:
            fallback_result = {"status": "error", "message": error_msg}

    return {
        "primary": primary_result,
        "fallback": fallback_result,
        "api_key_configured": bool(llm_service.gemini_api_key),
        "api_key_preview": llm_service.gemini_api_key[:10] + "..." if llm_service.gemini_api_key else None
    }


# Get available tables
@app.get("/api/tables")
async def get_tables():
    try:
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT table_name FROM uploaded_tables")
            tables = [row["table_name"] for row in cursor.fetchall()]
            return {"tables": tables}
        finally:
            conn.close()
    except Exception as e:
        logger.error(f"Error getting tables: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/schema")
async def get_schema(table: str, data_service: DataService = Depends(get_data_service)):
    schema = await data_service.get_table_schema_raw(table)
    return {"schema": schema}


@app.get("/api/schema/annotations")
async def get_schema_annotations(table: str, data_service: DataService = Depends(get_data_service)):
    annotations = await data_service.get_schema_annotations(table)
    return {"annotations": annotations}


@app.post("/api/schema/annotations")
async def save_schema_annotations(
    request: SchemaAnnotationRequest,
    data_service: DataService = Depends(get_data_service)
):
    await data_service.save_schema_annotations(request.table_name, request.annotations)
    return {"status": "ok"}


@app.get("/api/history")
async def get_history(limit: int = 20, data_service: DataService = Depends(get_data_service)):
    history = await data_service.get_query_history(limit)
    return {"history": history}


@app.post("/api/dashboards/pin")
async def pin_dashboard(payload: Dict[str, Any], data_service: DataService = Depends(get_data_service)):
    table_name = payload.get("table_name", "")
    natural_query = payload.get("natural_query", "")
    sql_query = payload.get("sql_query", "")
    visualization_type = payload.get("visualization_type", "table")
    await data_service.pin_dashboard(table_name, natural_query, sql_query, visualization_type)
    return {"status": "ok"}


@app.get("/api/dashboards")
async def get_dashboards(data_service: DataService = Depends(get_data_service)):
    pins = await data_service.get_dashboard_pins()
    return {"pins": pins}


@app.post("/api/query/fix")
async def fix_query(
    request: FixRequest,
    llm_service: LLMService = Depends(get_llm_service),
    data_service: DataService = Depends(get_data_service)
):
    schema = await _get_schema_with_annotations(request.table_name, data_service)
    sql_query = await llm_service.generate_sql(request.natural_query, schema)
    fix = await llm_service.fix_sql_error(request.error, sql_query, schema)
    fixed_query = fix.get("fixed_query", "").strip()
    if fixed_query:
        fixed_query = validate_and_prepare_sql(fixed_query, schema)
    return {"fixed_query": fixed_query, "analysis": fix.get("error_analysis", "")}


@app.post("/api/query/regenerate")
async def regenerate_query(
    request: RegenerateSqlRequest,
    llm_service: LLMService = Depends(get_llm_service),
    data_service: DataService = Depends(get_data_service)
):
    schema = await _get_schema_with_annotations(request.table_name, data_service)
    sql_query = await llm_service.regenerate_sql(
        natural_query=request.natural_query,
        table_schema=schema,
        current_sql=request.current_sql,
        error_message=request.error,
        result_sample=request.result_sample,
    )
    return {"sql_query": sql_query}


@app.post("/api/sql/explain")
async def explain_sql(
    request: ExplainSqlRequest,
    llm_service: LLMService = Depends(get_llm_service),
    data_service: DataService = Depends(get_data_service)
):
    schema = await _get_schema_with_annotations(request.table_name, data_service)
    explanation = await llm_service.explain_sql(
        sql_query=request.sql_query,
        table_schema=schema,
        natural_query=request.natural_query,
        result_sample=request.result_sample,
    )
    return {"explanation": explanation}


@app.post("/api/query/drilldown")
async def drilldown_query(
    request: DrilldownRequest,
    data_service: DataService = Depends(get_data_service)
):
    schema = await _get_schema_with_annotations(request.table_name, data_service)
    sql_query = validate_and_prepare_sql(request.sql_query, schema)
    results = await data_service.execute_query(sql_query)
    serializable_results = json.loads(json.dumps(results, cls=CustomJSONEncoder))
    return {"data": serializable_results}


@app.post("/api/table/rename")
async def rename_table(
    request: RenameTableRequest,
    data_service: DataService = Depends(get_data_service)
):
    await data_service.rename_table(request.old_name, request.new_name)
    return {"status": "ok", "table_name": request.new_name}


@app.post("/api/query/run-sql")
async def run_sql(
    request: RunSqlRequest,
    data_service: DataService = Depends(get_data_service)
):
    """
    Execute user-edited SQL with safety validation.
    """
    schema = await _get_schema_with_annotations(request.table_name, data_service)
    sql_query = validate_and_prepare_sql(request.sql_query, schema)
    results = await data_service.execute_query(sql_query)
    serializable_results = json.loads(json.dumps(results, cls=CustomJSONEncoder))
    return {
        "natural_language_response": "SQL executed successfully.",
        "sql_query": sql_query,
        "data": serializable_results,
        "explanation": "",
        "visualization_type": "table"
    }


# Database connection test endpoint
@app.get("/api/test-connections")
async def test_connections():
    results = {
        "postgresql": {"status": "unknown", "message": ""}
    }
    
    # Test PostgreSQL
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT version()")
        version = cursor.fetchone()["version"]
        conn.close()
        results["postgresql"] = {"status": "success", "message": f"Connected: {version}"}
    except Exception as e:
        results["postgresql"] = {"status": "error", "message": str(e)}
    
    return results


# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
