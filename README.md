# Innodex — AI Startup Feasibility Analyzer 🚀

Innodex is a premium, full-stack hybrid web application designed to act as an expert AI startup feasibility analyst. It combines the depth of a seasoned venture capitalist, the precision of a market researcher, and the empathy of a startup coach to help founders evaluate, stress-test, and sharpen their startup ideas.

## 🌟 Key Features

*   **Generative AI Analysis (Gemini Flash 2.5)**: Powered by a dedicated Python FastAPI backend leveraging the `google-genai` SDK to evaluate TAM/SAM/SOM, market gaps, monetization architectures, and stress-testing.
*   **Dynamic Chat Auto-Titling**: The Python backend seamlessly runs a secondary AI query to intelligently auto-generate catchy sidebar titles based on your initial startup idea message.
*   **Voice-to-Text Microphone Integration**: Uses native browser Web Speech API for zero-latency, highly accurate spoken prompts directly in the chat bar, complete with active listening animations.
*   **Dual Authentication & Security**: Secure local signup using `bcryptjs` and modern OAuth 2.0 integration (Login/Register with Google).
*   **Robust Admin Panel**: Strict role-based access control (RBAC). Admins can view all registered users, read full platform-wide chat logs, delete individual chats/users, and freely promote/demote other users.
*   **Premium Web3-Aesthetic UI**: Custom shimmering gradients, dynamic entrance animations, frosted glassmorphism hover cards, and smooth layout transitions without external heavy UI libraries.

## 🏗️ Architecture

The project utilizes a strict separation of concerns through a hybrid technology stack:

1.  **Frontend & Main App Node**: **Next.js (React/TypeScript)**
    *   Handles UI layout, global state, authentication cookies, routing, and Next.js Server Actions.
    *   Serves the public `/` Welcome landing page and protected `/chat` dashboard.
2.  **AI Processing Microservice**: **Python (FastAPI)**
    *   Located entirely in the `/backend` directory. Runs independently on Uvicorn and securely connects to the Gemini API, validating JSON payloads efficiently via Pydantic.
3.  **Database Layer**: **SQLite (`better-sqlite3`)**
    *   Locally handles strict relational schemas (Foreign Keys `ON DELETE CASCADE`) for structured fast data storage across Users, Sessions, Chats, and Messages.

## ⚙️ Local Setup & Installation

Because this is a hybrid application, you will need to run both the Node.js server and the Python API server simultaneously in two separate terminals.

### Prerequisites
*   Node.js (v18+)
*   Python (3.10+)
*   Gemini API Key

### 1. Environment Variables
Create a `.env.local` file in the root codebase directory and include:
```env
GEMINI_API_KEY=your_google_gemini_api_key_here
GOOGLE_CLIENT_ID=your_oauth_client_id_here
GOOGLE_CLIENT_SECRET=your_oauth_client_secret_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
*(Note: Both Next.js and the Python backend are configured to automatically load this file).*

### 2. Start the Frontend (Next.js)
In your first terminal, run:
```bash
npm install
npm run dev
```

### 3. Start the AI Backend (FastAPI)
In a second terminal, enter the backend folder and start the API router:
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload
```
*The Python server must be running on `http://127.0.0.1:8000` so that Next.js Server Actions can internally communicate with the AI engine.*

## 🛣️ Production Deployment Path
Due to the usage of a local `chat.db` SQLite file, the filesystem dictates local continuity. **Before deploying to serverless platforms like Vercel (which utilize volatile, read-only filesystems)**, the database config (`src/lib/db.ts`) must first be migrated to a cloud-edge database like **Turso** (Serverless SQLite) or **Supabase** (PostgreSQL).
