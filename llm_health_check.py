import os
import json
import httpx
from dotenv import load_dotenv

load_dotenv("text-to-sql-system/.env")

endpoint = os.getenv("LOCAL_LLM_ENDPOINT", "http://127.0.0.1:8001")
url = f"{endpoint.rstrip('/')}/v1/completions"

payload = {"prompt": "Hello", "max_tokens": 16, "temperature": 0.2}

print(f"Testing LLM endpoint: {url}")
try:
    with httpx.Client(timeout=10) as client:
        resp = client.post(url, json=payload)
        print("Status:", resp.status_code)
        print("Headers:", dict(resp.headers))
        text = resp.text
        print("Body:", text[:1000])
        try:
            data = resp.json()
            print("Parsed JSON keys:", list(data.keys()))
        except Exception as e:
            print("JSON parse error:", e)
except Exception as e:
    print("Request failed:", repr(e))
