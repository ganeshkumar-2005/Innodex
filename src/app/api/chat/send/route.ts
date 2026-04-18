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
      const res = await fetch(`${backendUrl}/api/chat`, {
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

      const data = await res.json();
      if (data.response) {
        modelReply = data.response;
      }
      if (data.title) {
        await updateChatTitle(chatId, data.title);
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
