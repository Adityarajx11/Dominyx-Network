import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCode } from '@/lib/discord';
import { setSessionToken, clearSessionToken } from '@/lib/session';
import { appUrl } from '@/lib/env';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const cookieState = cookies().get('dq_state')?.value;

  if (error) {
    return NextResponse.redirect(new URL('/?error=denied', appUrl));
  }
  if (!code || !state || state !== cookieState) {
    return NextResponse.redirect(new URL('/?error=invalid', appUrl));
  }

  cookies().set('dq_state', '', { httpOnly: true, maxAge: 0, path: '/' });

  try {
    const tokens = await exchangeCode(code);
    setSessionToken(tokens.access_token);
    return NextResponse.redirect(new URL('/dashboard', appUrl));
  } catch (err) {
    console.error('OAuth callback failed:', err.message);
    return NextResponse.redirect(new URL('/?error=failed', appUrl));
  }
}