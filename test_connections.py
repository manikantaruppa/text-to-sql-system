import psycopg2
from pymongo import MongoClient
import redis
import os
from dotenv import load_dotenv

def test_connections():
    # Load .env file
    dotenv_loaded = load_dotenv(dotenv_path='./.env')
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
