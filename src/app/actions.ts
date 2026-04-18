'use server';

import { getChats, createChat, getMessages, addMessage, updateChatTitle } from '@/lib/db';
import { revalidatePath } from 'next/cache';

import { getCurrentUser } from '@/app/auth-actions';

export async function fetchChats() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  return await getChats(user.id);
}

export async function fetchMessages(chatId: string) {
  return await getMessages(chatId);
}

export async function startNewChat(title: string) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const chats = await getChats(user.id);
    if (chats.length > 0) {
      const mostRecentChat = chats[0];
      const messages = await getMessages(mostRecentChat.id);
      if (messages.length === 0) {
        return mostRecentChat.id; 
      }
    }

    const chatId = 'chat_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    await createChat(chatId, user.id, title);
    revalidatePath('/chat');
    return chatId;
  } catch (err: any) {
    console.error('startNewChat Error:', err);
    return 'ERROR: ' + (err.message || String(err));
  }
}

export async function sendMessage(chatId: string, content: string) {
  // 1. Save user message to DB
  const msgId1 = 'msg_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  await addMessage(msgId1, chatId, 'user', content);

  // 2. Fetch context
  const previousMessages = await getMessages(chatId);

  // 3. Prepare generation config
  // Using the \`systemInstruction\` parameter and mapping existing messages to the SDK format

  const contents = previousMessages.map(msg => ({
    role: msg.role === 'model' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  // Append current message if it's not already in previousMessages (though we just added it, so it is)
  // Wait, \`contents\` already includes the message we just added to the DB. So we can just pass \`contents\`.

  // 4. Call our Local Python FastAPI Backend instead of direct Gemini SDK!
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
      throw new Error(`Backend API Error: ${res.statusText}`);
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


  // 5. Save model message
  const msgId2 = 'msg_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  await addMessage(msgId2, chatId, 'model', modelReply);

  revalidatePath(`/chat/${chatId}`);
  revalidatePath('/chat');

  return true;
}
