import { mobileAuthClient as supabase } from './mobileAuthClient';
import { createFinanceClient } from '../../shared/finance/client';
import { CONFIG } from './config';
// Only the current user access token goes to Go. Delegation remains backend-only.
export function financeRepository(userId: string) {
  return createFinanceClient({baseURL: CONFIG.API_URL, userId, session: async () => {
    const auth = (supabase as any).auth;
    let { data } = await auth.getSession();
    if (data?.session?.expires_at && data.session.expires_at < Date.now() / 1000 + 60) ({ data } = await auth.refreshSession());
    return data?.session ? {userId: data.session.user.id, token: data.session.access_token} : null;
  }});
}
