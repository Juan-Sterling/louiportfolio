import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js 16 Proxy Convention
 * Enforces server-side authentication guard on the /admin route.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public access to login and password recovery pages
  if (
    pathname === '/admin/login' ||
    pathname === '/admin/reset-password' ||
    pathname.startsWith('/admin/login/') ||
    pathname.startsWith('/admin/reset-password/')
  ) {
    return NextResponse.next();
  }

  // Check for the Supabase auth token cookie
  const authToken = request.cookies.get('sb-token')?.value;

  if (!authToken) {
    const loginUrl = new URL('/admin/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};

