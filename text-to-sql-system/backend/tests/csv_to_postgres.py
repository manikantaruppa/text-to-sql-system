#!/usr/bin/env python3
import os
import argparse
import pandas as pd
import sqlalchemy
from dotenv import load_dotenv
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text
from csv_processor import CSVPreprocessor

# -----------------------------------------------------------------------------
# 1) LOAD ENV & BUILD DB URL
# -----------------------------------------------------------------------------
load_dotenv()  # reads .env in cwd

DB_NAME   = os.getenv("POSTGRES_DB")
DB_USER   = os.getenv("POSTGRES_USER")
DB_PASS   = os.getenv("POSTGRES_PASSWORD")
DB_HOST   = os.getenv("POSTGRES_SERVER", "localhost")
DB_PORT   = os.getenv("POSTGRES_PORT", "5432")

if not all([DB_NAME, DB_USER, DB_PASS]):
    raise RuntimeError("Missing one of POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD in .env")

DB_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# -----------------------------------------------------------------------------
# 2) BULK LOAD INTO POSTGRES (with DROP & REPLACE)
# -----------------------------------------------------------------------------
def df_to_postgres(df: pd.DataFrame, db_url: str, table_name: str):
    engine = sqlalchemy.create_engine(db_url, future=True)
    with engine.begin() as conn:
        # 1) Drop table if it exists
        conn.execute(text(f'DROP TABLE IF EXISTS "{table_name}" CASCADE'))
        # 2) Create & load in one go (replace==create new)
        df.to_sql(
            name=table_name,
            con=conn,
            if_exists='replace',
            index=False,
            method='multi',
            chunksize=5000,
        )
    print(f"✅ Loaded {len(df)} rows into '{table_name}'.")

# -----------------------------------------------------------------------------
# 3) CLI ENTRYPOINT
# -----------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="CSV → Postgres loader")
    parser.add_argument("--csv-path", required=True, help="Path to your TSV/CSV file")
    parser.add_argument("--table",    required=True, help="Target Postgres table name")
    args = parser.parse_args()

    try:
        print("🔄 Loading & cleaning CSV…")
        pre = CSVPreprocessor(args.csv_path)
        df  = pre.preprocess()

        print("🧹 Sample data:")
        print(df.head(), "\n")

        print(f"🚀 Writing to Postgres ({DB_URL}) table '{args.table}'…")
        df_to_postgres(df, DB_URL, args.table)

    except SQLAlchemyError as db_err:
        print("❌ Database error:", db_err)
    except Exception as ex:
        print("❌ Unexpected error:", ex)

if __name__ == "__main__":
    main()
