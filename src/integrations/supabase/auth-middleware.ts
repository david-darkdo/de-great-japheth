import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

function getEnvVar(name: string): string | undefined {
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    return process.env[name];
  }
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[name]) {
    return import.meta.env[name];
  }
  return undefined;
}

export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const SUPABASE_URL =
      getEnvVar('SUPABASE_URL') ||
      getEnvVar('VITE_SUPABASE_URL');

    const SUPABASE_PUBLISHABLE_KEY =
      getEnvVar('SUPABASE_PUBLISHABLE_KEY') ||
      getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY') ||
      getEnvVar('SUPABASE_ANON_KEY');

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      const missing = [
        ...(!SUPABASE_URL ? ['SUPABASE_URL / VITE_SUPABASE_URL'] : []),
        ...(!SUPABASE_PUBLISHABLE_KEY ? ['SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_PUBLISHABLE_KEY'] : []),
      ];
      const message = `Missing Supabase environment variable(s): ${missing.join(', ')}.`;
      console.error(`[Supabase Auth Middleware] ${message}`);
      throw new Response(message, { status: 500 });
    }

    const request = getRequest();

    if (!request?.headers) {
      throw new Response('Unauthorized: No request headers available', { status: 401 });
    }

    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      throw new Response('Unauthorized: No authorization header provided', { status: 401 });
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new Response('Unauthorized: Only Bearer tokens are supported', { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      throw new Response('Unauthorized: No token provided', { status: 401 });
    }

    const supabase = createClient<Database>(
      SUPABASE_URL!,
      SUPABASE_PUBLISHABLE_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims) {
      throw new Response('Unauthorized: Invalid token', { status: 401 });
    }

    if (!data.claims.sub) {
      throw new Response('Unauthorized: No user ID found in token', { status: 401 });
    }

    return next({
      context: {
        supabase,
        userId: data.claims.sub,
        claims: data.claims,
      },
    })
  }
)
