#!/bin/bash

# Text-to-SQL System Setup Script
echo "=== Text-to-SQL System Setup with PostgreSQL ==="
echo "This script will set up both the backend and frontend components"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is required but not installed. Please install Python 3 and try again."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is required but not installed. Please install Node.js and try again."
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL is required but not installed. Please install PostgreSQL and try again."
    exit 1
fi

# Create project directories
echo "Creating project directories..."
mkdir -p text-to-sql-system/backend/static
mkdir -p text-to-sql-system/frontend

# Create .env file
echo "Creating .env file..."
cat > text-to-sql-system/.env << EOL
# PostgreSQL Connection
POSTGRES_DB=text_to_sql_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432

# MongoDB Connection (if needed)
MONGODB_URL=mongodb://localhost:27017/
MONGODB_DB=text_to_sql_db

# Redis Connection (if needed)
REDIS_HOST=localhost
REDIS_PORT=6379

# LLM Configuration
LOCAL_LLM_ENDPOINT=http://localhost:8501
LLM_TIMEOUT=60
LLM_MAX_TOKENS=1024
LLM_TEMPERATURE=0.3

# Server Configuration
DEBUG=True
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000
EOL

# Create requirements.txt
echo "Creating backend requirements.txt..."
cat > text-to-sql-system/backend/requirements.txt << EOL
fastapi==0.104.0
uvicorn==0.23.2
python-multipart==0.0.6
pydantic==2.4.2
pandas==2.1.1
httpx==0.25.0
sqlalchemy==2.0.22
aiofiles==23.2.1
jinja2==3.1.2
numpy==1.24.3
scikit-learn==1.2.2
scipy==1.10.1
psycopg2-binary==2.9.7
python-dotenv==1.0.0
pymongo==4.5.0
redis==4.6.0
EOL

# Install backend dependencies
echo "Installing backend dependencies..."
cd text-to-sql-system/backend
python3 -m pip install -r requirements.txt

# Create test_connections.py
echo "Creating connection test script..."
cat > test_connections.py << EOL
import psycopg2
from pymongo import MongoClient
import redis
import os
from dotenv import load_dotenv

def test_connections():
    # Load .env file
    dotenv_loaded = load_dotenv(dotenv_path='../.env')
    print(f".env loaded: {dotenv_loaded}")
    
    # Debug: print env variables
    print("POSTGRES_USER:", os.getenv('POSTGRES_USER'))
    print("MONGODB_DB:", os.getenv('MONGODB_DB'))
    print("REDIS_PORT:", os.getenv('REDIS_PORT'))
    
    # Test PostgreSQL
    try:
        conn = psycopg2.connect(
            dbname=os.getenv('POSTGRES_DB'),
            user=os.getenv('POSTGRES_USER'),
            password=os.getenv('POSTGRES_PASSWORD'),
            host=os.getenv('POSTGRES_SERVER')
        )
        print("✅ PostgreSQL connection successful!")
        conn.close()
    except Exception as e:
        print(f"❌ PostgreSQL connection failed: {e}")
    
    # Test MongoDB
    try:
        mongo_url = os.getenv('MONGODB_URL')
        client = MongoClient(mongo_url)
        db_name = os.getenv('MONGODB_DB')
        db = client[db_name]
        db.list_collection_names()
        print("✅ MongoDB connection successful!")
        client.close()
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
    
    # Test Redis
    try:
        r = redis.Redis(
            host=os.getenv('REDIS_HOST'),
            port=int(os.getenv('REDIS_PORT'))
        )
        r.ping()
        print("✅ Redis connection successful!")
        r.close()
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")

if __name__ == "__main__":
    test_connections()
EOL

# Set up the frontend
echo "Setting up the frontend..."
cd ../frontend

# Initialize a new React application
npx create-react-app . --template typescript

# Install additional dependencies
npm install axios recharts
npm install tailwindcss postcss autoprefixer --save-dev
npx tailwindcss init -p

# Update package.json to add proxy
node -e "
const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('./package.json'));
packageJson.proxy = 'http://localhost:8000';
fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
"

# Create tailwind.css
mkdir -p src
cat > src/tailwind.css << EOL
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Additional custom styles can go here */
EOL

# Create run script
cd ../..
cat > text-to-sql-system/run.sh << EOL
#!/bin/bash

# Start the backend server
echo "Starting backend server..."
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=\$!

# Start the frontend development server
echo "Starting frontend server..."
cd ../frontend
npm start &
FRONTEND_PID=\$!

# Handle shutdown
function cleanup {
  echo "Shutting down servers..."
  kill \$BACKEND_PID
  kill \$FRONTEND_PID
  exit
}

trap cleanup SIGINT

# Wait for user to terminate
echo "Servers running. Press Ctrl+C to stop."
wait
EOL

chmod +x text-to-sql-system/run.sh

echo "=== Setup Complete ==="
echo "Next steps:"
echo "1. Copy the backend files (main.py, prompting_service.py, schema_analyzer.py) into text-to-sql-system/backend/"
echo "2. Copy the frontend components into text-to-sql-system/frontend/src/"
echo "3. Test database connections: cd text-to-sql-system/backend && python test_connections.py"
echo "4. Start the application: cd text-to-sql-system && ./run.sh"
echo "5. Access the web interface at http://localhost:3000"