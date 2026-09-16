import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { oauthAuthorizeUrl } from '@/lib/discord';
import { appUrl } from '@/lib/env';

export async function GET() {
  const state = crypto.randomBytes(16).toString('hex');
  cookies().set('dq_state', state, { httpOnly: true, sameSite: 'lax', maxAge: 600, path: '/' });
  const url = oauthAuthorizeUrl(state);
  return NextResponse.redirect(new URL(url, appUrl));
}