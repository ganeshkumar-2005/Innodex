import { fetchMessages } from '@/app/actions';
import ChatArea from '@/components/ChatArea';

export const dynamic = 'force-dynamic';

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const messages = await fetchMessages(id);

  return <ChatArea chatId={id} initialMessages={messages} />;
}
