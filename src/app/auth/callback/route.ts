import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  // Public and OAuth logins are disabled for the CRM. Only admin authentication is permitted.
  return NextResponse.redirect(new URL('/login?error=oauth_disabled', requestUrl.origin))
}
