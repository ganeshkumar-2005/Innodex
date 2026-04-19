import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv(os.path.join('.', '..', '.env.local'))
api_key = os.environ.get('GEMINI_API_KEY')
print("API Key loaded:", bool(api_key))
client = genai.Client(api_key=api_key)
formatted_contents = [types.Content(role='user', parts=[types.Part.from_text(text='hi')])]
try:
  response = client.models.generate_content(
      model='gemini-2.5-flash', 
      contents=formatted_contents, 
      config=types.GenerateContentConfig(temperature=0.7, system_instruction='test')
  )
  print(response.text)
except Exception as e:
  import traceback
  traceback.print_exc()
