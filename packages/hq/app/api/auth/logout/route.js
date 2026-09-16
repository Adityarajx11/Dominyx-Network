import { NextResponse } from 'next/server';
import { clearSessionToken } from '@/lib/session';
import { appUrl } from '@/lib/env';

export async function GET() {
  clearSessionToken();
  return NextResponse.redirect(new URL('/', appUrl));
}