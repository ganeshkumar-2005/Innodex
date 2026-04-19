import os
from dotenv import load_dotenv
from google import genai

load_dotenv(os.path.join('.', '..', '.env.local'))
api_key = os.environ.get('GEMINI_API_KEY')
client = genai.Client(api_key=api_key)

try:
    for model in client.models.list():
        print(model.name)
except Exception as e:
    print(f"Error: {e}")
