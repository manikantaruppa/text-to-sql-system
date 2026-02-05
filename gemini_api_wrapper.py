# gemini_api_wrapper.py
import os
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from google import genai
from google.genai import types  # Added import for types
from dotenv import load_dotenv
from pathlib import Path
from typing import Dict, Any, List

# Load environment variables (explicit project root .env)
_ROOT_ENV = Path(__file__).resolve().parent / "text-to-sql-system" / ".env"
if not _ROOT_ENV.exists():
    # fallback to repo root (same directory)
    _ROOT_ENV = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=_ROOT_ENV)

# Get API key
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable is not set")

# Initialize Gemini client
# genai.configure(api_key=GOOGLE_API_KEY)  # Changed to configure method
client = genai.Client(api_key=GOOGLE_API_KEY)  # No need to pass api_key here

# Initialize FastAPI
app = FastAPI(title="Gemini API Wrapper")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models to try in order - if one is exhausted, try the next
# Tested and verified working models first, then fallbacks
FALLBACK_MODELS = [
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

def try_generate_content(prompt: str, max_tokens: int, temperature: float):
    """Try multiple models until one works."""
    last_error = None
    for model_name in FALLBACK_MODELS:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    max_output_tokens=max_tokens,
                    temperature=temperature,
                )
            )
            if response.text:
                return response, model_name
        except Exception as e:
            error_str = str(e)
            last_error = e
            # If quota exhausted, try next model
            if "RESOURCE_EXHAUSTED" in error_str or "429" in error_str:
                print(f"Model {model_name} quota exhausted, trying next...")
                continue
            # For other errors, also try next model
            print(f"Model {model_name} failed: {error_str[:100]}, trying next...")
            continue
    raise last_error or Exception("All models failed")

@app.post("/v1/completions")
async def create_completion(request: Request):
    """
    Endpoint that mimics OpenAI's completions API format but uses Gemini
    """
    try:
        # Get the JSON body
        body = await request.json()

        # Extract parameters
        prompt = body.get("prompt", "")
        max_tokens = body.get("max_tokens", 512)
        temperature = body.get("temperature", 0.7)

        # Generate content using Gemini with fallback models
        response, model_used = try_generate_content(prompt, max_tokens, temperature)

        # Format response like OpenAI's API
        return {
            "id": f"gemini-{hash(prompt) % 10000}",
            "object": "text_completion",
            "created": int(__import__('time').time()),
            "model": model_used,
            "choices": [
                {
                    "text": response.text,
                    "index": 0,
                    "logprobs": None,
                    "finish_reason": "stop"
                }
            ],
            "usage": {
                "prompt_tokens": len(prompt.split()),
                "completion_tokens": len(response.text.split()),
                "total_tokens": len(prompt.split()) + len(response.text.split())
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/v1/chat/completions")
async def create_chat_completion(request: Request):
    """
    Endpoint that mimics OpenAI's chat completions API format but uses Gemini
    """
    try:
        # Get the JSON body
        body = await request.json()

        # Extract parameters
        messages = body.get("messages", [])
        max_tokens = body.get("max_tokens", 512)
        temperature = body.get("temperature", 0.7)

        # Convert OpenAI message format to text for Gemini
        prompt = ""
        for message in messages:
            role = message.get("role", "")
            content = message.get("content", "")

            if role == "system":
                prompt += f"System instruction: {content}\n\n"
            elif role == "user":
                prompt += f"User: {content}\n"
            elif role == "assistant":
                prompt += f"Assistant: {content}\n"

        # Generate content using Gemini with fallback models
        response, model_used = try_generate_content(prompt, max_tokens, temperature)

        # Format response like OpenAI's API
        return {
            "id": f"chatgemini-{hash(prompt) % 10000}",
            "object": "chat.completion",
            "created": int(__import__('time').time()),
            "model": model_used,
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": response.text
                    },
                    "finish_reason": "stop"
                }
            ],
            "usage": {
                "prompt_tokens": len(prompt.split()),
                "completion_tokens": len(response.text.split()),
                "total_tokens": len(prompt.split()) + len(response.text.split())
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def read_root():
    return {
        "message": "Gemini API Wrapper is running. Use /v1/completions or /v1/chat/completions endpoints.",
        "fallback_models": FALLBACK_MODELS,
        "note": "Models are tried in order. If one hits quota limit, the next is used."
    }

@app.get("/v1/models")
def list_models():
    """List available fallback models."""
    return {
        "models": FALLBACK_MODELS,
        "description": "Models tried in order until one succeeds"
    }

if __name__ == "__main__":
    uvicorn.run("gemini_api_wrapper:app", host="0.0.0.0", port=8501, reload=True)
