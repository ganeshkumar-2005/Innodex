import { NextResponse } from 'next/server';
import { getMessages, addMessage, updateChatTitle } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { chatId, content } = await req.json();

    const msgId1 = 'msg_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    await addMessage(msgId1, chatId, 'user', content);

    const previousMessages = await getMessages(chatId);

    const contents = previousMessages.map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    let generateTitle = false;
    if (previousMessages.length === 1) {
      generateTitle = true;
    }

    let modelReply = 'Sorry, I am unable to reply at this moment. Please try again later.';

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://innodex.onrender.com';
      
      // Use streaming endpoint for faster perceived response
      const res = await fetch(`${backendUrl}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contents, generate_title: generateTitle }),
        cache: 'no-store'
      });

      if (!res.ok) {
        let errorDetail = res.statusText;
        try {
          const errorBody = await res.json();
          if (errorBody.detail) errorDetail = errorBody.detail;
        } catch (e) {}
        throw new Error(`Backend API Error: ${errorDetail}`);
      }

      // Parse SSE stream to collect full response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let title: string | null = null;

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // keep incomplete line in buffer
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.token) {
                  fullResponse += data.token;
                }
                if (data.done) {
                  if (data.full_response) fullResponse = data.full_response;
                  if (data.title) title = data.title;
                }
                if (data.error) {
                  throw new Error(data.error);
                }
              } catch (parseErr: any) {
                if (parseErr.message && !parseErr.message.includes('JSON')) {
                  throw parseErr;
                }
              }
            }
          }
        }
      }

      if (fullResponse) {
        modelReply = fullResponse;
      }
      if (title) {
        await updateChatTitle(chatId, title);
      }
    } catch (err: any) {
      if (err.message && (err.message.includes('fetch failed') || err.message.includes('ECONNREFUSED'))) {
        modelReply = "⚠️ The Python FastAPI backend is not running! Please start it on port 8000 by running: `cd backend && uvicorn main:app --reload`";
      } else {
        modelReply = "An error occurred while connecting to the python backend: " + (err.message || 'Unknown error');
      }
    }

    const msgId2 = 'msg_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    await addMessage(msgId2, chatId, 'model', modelReply);

    return NextResponse.json({ success: true, reply: modelReply, msgId: msgId2 });
  } catch (outerErr: any) {
    console.error("SEND_MESSAGE_FATAL_ERROR:", outerErr);
    return NextResponse.json({ error: outerErr.message || String(outerErr) }, { status: 500 });
  }
}
