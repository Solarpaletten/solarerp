import { getCurrentUser } from './getCurrentUser';

type TenantContext = {
  userId: string;
  tenantId: string;
};

export async function requireTenant(request: Request): Promise<TenantContext> {
  const user = await getCurrentUser(request);

  if (!user || !user.tenantId) {
    throw new Response('Unauthorized', { status: 401 });
  }

  return { userId: user.id, tenantId: user.tenantId };
}

