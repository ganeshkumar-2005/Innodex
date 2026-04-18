from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import os
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

@app.post("/api/chat")
async def chat(req: ChatRequest):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY environment variable not set on Python backend")
    
    # Initialize the modern python SDK client
    client = genai.Client(api_key=api_key)
    
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
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=formatted_contents,
            config=types.GenerateContentConfig(
                temperature=0.7,
                system_instruction=INNODEX_SYSTEM_PROMPT
            )
        )
        
        result = {"response": response.text}
        
        if req.generate_title and len(req.contents) > 0:
            first_user_msg = req.contents[0].parts[0].text
            title_config = types.GenerateContentConfig(
                temperature=0.3,
                system_instruction="You are a title generator. Generate a concise, catchy, 2-to-4 word title for this startup idea. Output NOTHING but the title without quotes."
            )
            title_response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[first_user_msg],
                config=title_config
            )
            result["title"] = title_response.text.strip().strip('"').strip("'")
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
