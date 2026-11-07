import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

/**
 * Validates the admin session for protected server routes.
 * Checks Bearer token in Authorization header, sb-token cookie, or query param.
 */
export async function verifyAdminSession(
  request: Request | NextRequest
): Promise<{ authorized: boolean; user?: unknown; error?: string }> {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      authorized: false,
      error: 'Supabase credentials are not configured on server.',
    };
  }

  // 1. Authorization header (Bearer <token>)
  let token: string | null = null;
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.substring(7).trim();
  }

  // 2. Cookie (sb-token)
  if (!token) {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/(?:^|;\s*)sb-token=([^;]+)/);
    if (match) {
      token = decodeURIComponent(match[1].trim());
    }
  }

  // 3. Query param token (used as fallback for beacon/keepalive unload requests)
  if (!token) {
    try {
      const url = new URL(request.url);
      token = url.searchParams.get('token');
    } catch {
      // ignore URL parsing errors
    }
  }

  if (!token) {
    return {
      authorized: false,
      error: 'Unauthorized: missing authentication credentials.',
    };
  }

  try {
    const client = createClient(supabaseUrl, serviceRoleKey || supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error,
    } = await client.auth.getUser(token);

    if (error || !user) {
      return {
        authorized: false,
        error: 'Unauthorized: invalid or expired session token.',
      };
    }

    return { authorized: true, user };
  } catch (err: unknown) {
    const error = err as Error;
    return {
      authorized: false,
      error: `Authentication verification failed: ${error.message || 'unknown error'}`,
    };
  }
}

