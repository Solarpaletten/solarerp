import prisma from '@/lib/prisma';

type AuthUser = {
  id: string;
  email: string;
  tenantId: string;
} | null;

export async function getCurrentUser(request: Request): Promise<AuthUser> {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, tenantId: true }
    });

    return user ?? null;
  } catch {
    return null;
  }
}

