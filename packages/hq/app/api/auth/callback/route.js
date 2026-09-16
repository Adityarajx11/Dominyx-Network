import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCode } from '@/lib/discord';
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

  const redirects = {};
  redirects.clearState = (res) => {
    res.cookies.set('dq_state', '', { httpOnly: true, maxAge: 0, path: '/' });
    return res;
  };

  const res = redirects.clearState(NextResponse.redirect(new URL('/dashboard', appUrl)));
  try {
    const tokens = await exchangeCode(code);
    res.cookies.set('dq_session', tokens.access_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return res;
  } catch (err) {
    console.error('OAuth callback failed:', err.message);
    return NextResponse.redirect(new URL('/?error=failed', appUrl));
  }
}