import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

// Edge-safe proxy. Uses only the JWT cookie to check auth — no DB calls.
// Real session validation happens in server pages via auth() from '@/auth'.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    '/today/:path*',
    '/products/:path*',
    '/library/:path*',
    '/chat/:path*',
    '/history/:path*',
  ],
};
