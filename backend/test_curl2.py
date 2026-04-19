import httpx

data = {
    "contents": [{"role": "user", "parts": [{"text": "I want to build an AI platform for legal document review."}]}],
    "generate_title": True
}
response = httpx.post("http://localhost:8001/api/chat", json=data)
print(response.status_code)
print(response.text)
