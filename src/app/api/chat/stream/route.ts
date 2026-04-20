import { getMessages, addMessage, updateChatTitle } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { chatId, content } = await req.json();

    // Save user message
    const msgId1 = 'msg_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    await addMessage(msgId1, chatId, 'user', content);

    const previousMessages = await getMessages(chatId);

    const contents = previousMessages.map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    let generateTitle = previousMessages.length === 1;

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://innodex.onrender.com';

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const res = await fetch(`${backendUrl}/api/chat/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents, generate_title: generateTitle }),
            cache: 'no-store'
          });

          if (!res.ok) {
            let errorDetail = res.statusText;
            try {
              const errorBody = await res.json();
              if (errorBody.detail) errorDetail = errorBody.detail;
            } catch (e) {}
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `Backend Error: ${errorDetail}` })}\n\n`));
            controller.close();
            return;
          }

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
              buffer = lines.pop() || '';
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    if (data.token) {
                      fullResponse += data.token;
                      // Forward token to client
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: data.token })}\n\n`));
                    }
                    if (data.done) {
                      if (data.full_response) fullResponse = data.full_response;
                      if (data.title) title = data.title;
                    }
                    if (data.error) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: data.error })}\n\n`));
                      controller.close();
                      return;
                    }
                  } catch (parseErr) {
                    // Skip malformed JSON
                  }
                }
              }
            }
          }

          // Save model reply to DB
          const finalReply = fullResponse || 'Sorry, I could not generate a response.';
          const msgId2 = 'msg_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
          await addMessage(msgId2, chatId, 'model', finalReply);

          if (title) {
            await updateChatTitle(chatId, title);
          }

          // Send done event to client
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, msgId: msgId2, title })}\n\n`));
          controller.close();
        } catch (err: any) {
          let errorMsg = err.message || 'Unknown error';
          if (err.message && (err.message.includes('fetch failed') || err.message.includes('ECONNREFUSED'))) {
            errorMsg = "⚠️ The Python backend is not running!";
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (outerErr: any) {
    console.error("STREAM_FATAL_ERROR:", outerErr);
    return new Response(JSON.stringify({ error: outerErr.message || String(outerErr) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
