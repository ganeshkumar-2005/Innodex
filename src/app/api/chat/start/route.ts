import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getChats, getMessages, createChat } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { title } = await req.json();
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const chats = await getChats(user.id);
    if (chats.length > 0) {
      const mostRecentChat = chats[0];
      const messages = await getMessages(mostRecentChat.id);
      if (messages.length === 0) {
        return NextResponse.json({ chatId: mostRecentChat.id });
      }
    }

    const chatId = 'chat_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    await createChat(chatId, user.id, title);
    
    return NextResponse.json({ chatId });
  } catch (err: any) {
    console.error('startNewChat API Error:', err);
    return NextResponse.json({ error: err.message || 'Server Error' }, { status: 500 });
  }
}
