'use server';

import { deleteUserAdmin, deleteChat, updateUserRole } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function deleteUserAdminAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    throw new Error('Unauthorized');
  }

  const userId = formData.get('userId') as string;
  if (!userId) return;

  await deleteUserAdmin(userId);
  revalidatePath('/admin');
}

export async function changeUserRoleAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    throw new Error('Unauthorized');
  }

  const userId = formData.get('userId') as string;
  const newRole = formData.get('role') as 'user' | 'admin';
  if (!userId || !newRole) return;

  // Safety: Prevent admin from demoting themselves via UI
  if (userId === user.id && newRole === 'user') {
     throw new Error('Cannot demote yourself');
  }

  await updateUserRole(userId, newRole);
  revalidatePath('/admin');
}

export async function deleteChatAdminAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    throw new Error('Unauthorized');
  }

  const chatId = formData.get('chatId') as string;
  if (!chatId) return;

  await deleteChat(chatId);
  revalidatePath('/admin');
}
