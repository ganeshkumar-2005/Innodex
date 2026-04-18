import { getMessages } from '@/lib/db';
import ChatArea from '@/components/ChatArea';

export const dynamic = 'force-dynamic';

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const messages = await getMessages(id);
    return <ChatArea chatId={id} initialMessages={messages} />;
  } catch (err: any) {
    return <div style={{ color: 'red', margin: '100px' }}>
      <h1>CRITICAL SERVER COMPONENT ERROR</h1>
      <pre>{err.message || String(err)}</pre>
    </div>;
  }
}
