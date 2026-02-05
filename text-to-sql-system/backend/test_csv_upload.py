# test_csv_upload.py
import asyncio
import sys
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("csv_test")

# Add current directory to path so we can import from main.py
sys.path.append('.')

try:
    from main import DataService, get_db_connection
except ImportError as e:
    logger.error(f"Failed to import from main.py: {e}")
    sys.exit(1)

async def test_csv_upload(csv_path, table_name):
    """Test CSV upload directly"""
    logger.info(f"Testing CSV upload: {csv_path} -> {table_name}")
    
    try:
        # Read the CSV file
        csv_file = Path(csv_path)
        if not csv_file.exists():
            logger.error(f"CSV file not found: {csv_path}")
            return
        
        file_content = csv_file.read_bytes()
        logger.info(f"Read {len(file_content)} bytes from {csv_path}")
        
        # Create DataService
        data_service = DataService()
        
        # Process the CSV
        try:
            schema = await data_service.process_csv(file_content, table_name)
            logger.info("CSV processed successfully!")
            logger.info(f"Schema: {schema}")
        except Exception as e:
            logger.error(f"Error processing CSV: {str(e)}", exc_info=True)
    
    except Exception as e:
        logger.error(f"Test failed: {str(e)}", exc_info=True)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python test_csv_upload.py <csv_file_path> <table_name>")
        sys.exit(1)
    
    csv_path = sys.argv[1]
    table_name = sys.argv[2]
    
    asyncio.run(test_csv_upload(csv_path, table_name))