import httpx
import json

data = {"contents": [{"role": "user", "parts": [{"text": "hello"}]}]}
response = httpx.post("http://localhost:8001/api/chat", json=data)
print(response.status_code)
print(response.text)
