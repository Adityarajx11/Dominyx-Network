import { NextResponse } from 'next/server';
import { appUrl } from '@/lib/env';

export async function GET() {
  const res = NextResponse.redirect(new URL('/', appUrl));
  res.cookies.set('dq_session', '', { httpOnly: true, maxAge: 0, path: '/' });
  res.cookies.set('dq_state', '', { httpOnly: true, maxAge: 0, path: '/' });
  return res;
}