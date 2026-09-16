import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { oauthAuthorizeUrl } from '@/lib/discord';

export async function GET() {
  const state = crypto.randomBytes(16).toString('hex');
  const res = NextResponse.redirect(oauthAuthorizeUrl(state));
  res.cookies.set('dq_state', state, { httpOnly: true, sameSite: 'lax', maxAge: 600, path: '/' });
  return res;
}