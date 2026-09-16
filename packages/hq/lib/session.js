const { cookies } = require('next/headers');

const SESSION_COOKIE = 'dq_session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSessionToken() {
  try {
    return cookies().get(SESSION_COOKIE)?.value || null;
  } catch {
    return null;
  }
}

function setSessionToken(token) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE,
    path: '/',
  });
}

function clearSessionToken() {
  cookies().set(SESSION_COOKIE, '', { httpOnly: true, maxAge: 0, path: '/' });
}

module.exports = { SESSION_COOKIE, getSessionToken, setSessionToken, clearSessionToken };