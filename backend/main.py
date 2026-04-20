from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List
import os
import json
import httpx
import asyncio
from dotenv import load_dotenv

# Load the Next.js .env.local file from the parent directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))
# Also try .env just in case
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from google import genai
from google.genai import types

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

INNODEX_SYSTEM_PROMPT = """# SYSTEM PROMPT — AI Startup Feasibility Analyzer (Innodex) v1.0

## Role
You are Innodex, an expert AI startup feasibility analyst and strategic advisor. You combine the depth of a seasoned venture capitalist, the precision of a market researcher, and the empathy of a startup coach. Your mission: help founders evaluate, stress-test, and sharpen startup ideas through intelligent conversation and data-driven analysis.

---

## Core Behavior
1. ALWAYS begin by warmly greeting the user and asking for their startup idea in 1–3 sentences if not provided.
2. NEVER give generic advice. Every response must be tailored to the specific idea, industry, and founder context provided.
3. PROACTIVELY ask clarifying questions one at a time — never barrage the user with 5 questions at once.
4. ADAPT tone: be encouraging but ruthlessly honest. Hype is the enemy of good decisions.

---

## Analysis Framework
When a startup idea is submitted, perform a structured evaluation across these dimensions:

### A. Dynamic Feasibility Score™ (0–100)
Compute and display a live score built from:
- Market Size (TAM/SAM/SOM): 20 pts
- Problem Severity & Frequency: 20 pts
- Competitive Moat Potential: 15 pts
- Monetization Clarity: 15 pts
- Execution Complexity: 10 pts
- Regulatory Risk: 10 pts
- Founder–Market Fit: 10 pts
Display score as: [SCORE: 72/100 — Strong Potential] with a 1-line verdict.
Update the score transparently whenever the user provides new information.

### B. Market Intelligence Layer
- Estimate TAM, SAM, and SOM with explicit assumptions.
- Identify top 3–5 direct and indirect competitors.
- Surface the Competitor Blind-Spot.
- State market growth trajectory.

### C. Idea Stress-Test (Devil's Advocate Mode)
Automatically activate after initial analysis. Challenge the idea with:
- "What if the core assumption is wrong?"
- "Why hasn't a well-funded team solved this yet?"
- "What does the business look like in a downturn?"

### D. Monetization Fit Matrix
Map the idea to the most suitable monetization archetypes and recommend top 2 with rationale.

### E. Regulatory Radar
Identify key regulatory considerations based on industry (GDPR, HIPAA, etc.).

### F. Pivot Suggestion Engine
If Feasibility Score < 55, automatically generate 2–3 pivot options.

### G. Founder–Market Fit Probe
Ask conversational questions to assess founder edge.

### H. 1-Page Investor Pitch Draft
When requested, output a structured 1-page pitch: Problem | Solution | Why Now | Market Size | Business Model | Competitive Edge | Traction/Roadmap | Ask.

---

## Tone & Guardrails
- Be honest about low-feasibility ideas.
- Never fabricate market data.
- Maintain conversational continuity.
- End each response with ONE focused follow-up question.
- Use explicit markdown formatting (headers, bolding) to make the analysis clear.
"""

class MessagePart(BaseModel):
    text: str

class Message(BaseModel):
    role: str
    parts: List[MessagePart]

class ChatRequest(BaseModel):
    contents: List[Message]
    generate_title: bool = False


# ── Keep-alive endpoint to prevent Render cold starts ──
@app.get("/health")
async def health():
    return {"status": "ok"}


# ── Helper: generate title in background ──
async def _generate_title_openrouter(first_msg: str, headers: dict) -> str | None:
    try:
        async with httpx.AsyncClient() as client:
            title_payload = {
                "model": "google/gemini-2.0-flash-001",
                "messages": [
                    {"role": "system", "content": "You are a title generator. Generate a concise, catchy, 2-to-4 word title for this startup idea. Output NOTHING but the title without quotes."},
                    {"role": "user", "content": first_msg}
                ],
                "temperature": 0.3
            }
            t_res = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=title_payload,
                timeout=30.0
            )
            if t_res.status_code == 200:
                t_data = t_res.json()
                return t_data["choices"][0]["message"]["content"].strip().strip('"').strip("'")
    except Exception:
        pass
    return None


async def _generate_title_gemini(first_msg: str, gemini_key: str) -> str | None:
    try:
        client = genai.Client(api_key=gemini_key)
        model_name = 'gemini-2.0-flash'
        title_config = types.GenerateContentConfig(
            temperature=0.3,
            system_instruction="You are a title generator. Generate a concise, catchy, 2-to-4 word title for this startup idea. Output NOTHING but the title without quotes."
        )
        title_response = client.models.generate_content(
            model=model_name,
            contents=[first_msg],
            config=title_config
        )
        return title_response.text.strip().strip('"').strip("'")
    except Exception:
        pass
    return None


# ── Streaming endpoint (Server-Sent Events) ──
@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    openrouter_key = os.environ.get("OPENROUTER_API_KEY")
    gemini_key = os.environ.get("GEMINI_API_KEY")

    formatted_messages = []
    for msg in req.contents:
        role = "user" if msg.role == "user" else "assistant"
        formatted_messages.append({"role": role, "content": msg.parts[0].text})

    # Fire off title generation concurrently (non-blocking)
    title_task = None
    if req.generate_title and len(req.contents) > 0:
        first_user_msg = req.contents[0].parts[0].text
        if openrouter_key:
            headers = {
                "Authorization": f"Bearer {openrouter_key}",
                "Content-Type": "application/json"
            }
            title_task = asyncio.create_task(_generate_title_openrouter(first_user_msg, headers))
        elif gemini_key:
            title_task = asyncio.create_task(_generate_title_gemini(first_user_msg, gemini_key))

    async def event_generator():
        nonlocal title_task
        full_text = ""

        try:
            if openrouter_key:
                # ── OpenRouter streaming ──
                async with httpx.AsyncClient() as client:
                    headers = {
                        "Authorization": f"Bearer {openrouter_key}",
                        "Content-Type": "application/json"
                    }
                    chat_payload = {
                        "model": "google/gemini-2.0-flash-001",
                        "messages": [
                            {"role": "system", "content": INNODEX_SYSTEM_PROMPT},
                            *formatted_messages
                        ],
                        "temperature": 0.7,
                        "stream": True
                    }
                    async with client.stream(
                        "POST",
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers=headers,
                        json=chat_payload,
                        timeout=90.0
                    ) as response:
                        if response.status_code != 200:
                            error_body = await response.aread()
                            yield f"data: {json.dumps({'error': f'OpenRouter Error: {error_body.decode()}'})}\n\n"
                            return
                        async for line in response.aiter_lines():
                            if line.startswith("data: "):
                                data_str = line[6:]
                                if data_str.strip() == "[DONE]":
                                    break
                                try:
                                    chunk = json.loads(data_str)
                                    delta = chunk.get("choices", [{}])[0].get("delta", {})
                                    token = delta.get("content", "")
                                    if token:
                                        full_text += token
                                        yield f"data: {json.dumps({'token': token})}\n\n"
                                except json.JSONDecodeError:
                                    continue

            elif gemini_key:
                # ── Gemini SDK (non-streaming fallback, sent in chunks) ──
                client_g = genai.Client(api_key=gemini_key)
                model_name = 'gemini-2.0-flash'
                formatted_contents = []
                for msg in req.contents:
                    role = "user" if msg.role == "user" else "model"
                    formatted_contents.append(
                        types.Content(
                            role=role,
                            parts=[types.Part.from_text(text=msg.parts[0].text)]
                        )
                    )

                response = client_g.models.generate_content(
                    model=model_name,
                    contents=formatted_contents,
                    config=types.GenerateContentConfig(
                        temperature=0.7,
                        system_instruction=INNODEX_SYSTEM_PROMPT
                    )
                )
                full_text = response.text
                # Send in small chunks to simulate streaming
                chunk_size = 20
                for i in range(0, len(full_text), chunk_size):
                    yield f"data: {json.dumps({'token': full_text[i:i+chunk_size]})}\n\n"
                    await asyncio.sleep(0.01)
            else:
                yield f"data: {json.dumps({'error': 'No API Key found'})}\n\n"
                return

        except Exception as e:
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

        # Wait for title if needed and send it as a final event
        title = None
        if title_task:
            title = await title_task

        yield f"data: {json.dumps({'done': True, 'full_response': full_text, 'title': title})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ── Original non-streaming endpoint (kept for backward compatibility) ──
@app.post("/api/chat")
async def chat(req: ChatRequest):
    openrouter_key = os.environ.get("OPENROUTER_API_KEY")
    gemini_key = os.environ.get("GEMINI_API_KEY")
    
    # Pre-process messages
    formatted_messages = []
    for msg in req.contents:
        role = "user" if msg.role == "user" else "assistant" # assistant for OpenRouter, model for Gemini
        formatted_messages.append({"role": role, "content": msg.parts[0].text})

    if openrouter_key:
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {openrouter_key}",
                    "Content-Type": "application/json"
                }
                
                # Main Chat Request
                chat_payload = {
                    "model": "google/gemini-2.0-flash-001", # High performance OpenRouter model
                    "messages": [
                        {"role": "system", "content": INNODEX_SYSTEM_PROMPT},
                        *formatted_messages
                    ],
                    "temperature": 0.7
                }
                
                # Fire title generation concurrently
                title_task = None
                if req.generate_title and len(req.contents) > 0:
                    first_user_msg = req.contents[0].parts[0].text
                    title_task = asyncio.create_task(
                        _generate_title_openrouter(first_user_msg, headers)
                    )
                
                response = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=chat_payload,
                    timeout=60.0
                )
                
                if response.status_code != 200:
                    raise Exception(f"OpenRouter Error: {response.text}")
                
                data = response.json()
                reply_text = data["choices"][0]["message"]["content"]
                result = {"response": reply_text}
                
                # Await title if we started generating one
                if title_task:
                    title = await title_task
                    if title:
                        result["title"] = title
                
                return result
        except Exception as e:
            import traceback
            traceback.print_exc()
            if not gemini_key:
                raise HTTPException(status_code=500, detail=f"OpenRouter Error: {str(e)}")
            # Fallback to Gemini if OpenRouter fails and Gemini key exists
            print("OpenRouter failed, falling back to Gemini...")

    # Gemini Fallback (Existing Logic)
    if not gemini_key:
        raise HTTPException(status_code=500, detail="No API Key found (GEMINI_API_KEY or OPENROUTER_API_KEY)")
    
    client = genai.Client(api_key=gemini_key)
    
    formatted_contents = []
    for msg in req.contents:
        role = "user" if msg.role == "user" else "model"
        formatted_contents.append(
            types.Content(
                role=role, 
                parts=[types.Part.from_text(text=msg.parts[0].text)]
            )
        )
    
    try:
        model_name = 'gemini-2.0-flash'
        
        # Fire title generation concurrently
        title_task = None
        if req.generate_title and len(req.contents) > 0:
            first_user_msg = req.contents[0].parts[0].text
            title_task = asyncio.create_task(
                _generate_title_gemini(first_user_msg, gemini_key)
            )
        
        response = client.models.generate_content(
            model=model_name,
            contents=formatted_contents,
            config=types.GenerateContentConfig(
                temperature=0.7,
                system_instruction=INNODEX_SYSTEM_PROMPT
            )
        )
        
        result = {"response": response.text}
        
        if title_task:
            title = await title_task
            if title:
                result["title"] = title
            
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
