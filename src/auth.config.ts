import Google from 'next-auth/providers/google';
import type { NextAuthConfig } from 'next-auth';

// Edge-safe base config. NO Prisma here — middleware bundles this and
// has a 1 MB size limit on Vercel's Hobby tier.
export const authConfig = {
  providers: [Google],
  pages: {
    signIn: '/login',
  },
} satisfies NextAuthConfig;
