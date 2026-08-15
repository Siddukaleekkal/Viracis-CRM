import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  cookieStore.delete('viracis_dev_auth')
  cookieStore.delete('viracis_user_email')

  const url = new URL('/login', request.url)
  return NextResponse.redirect(url, { status: 303 })
}

export async function GET(request: Request) {
  const cookieStore = await cookies()
  cookieStore.delete('viracis_dev_auth')
  cookieStore.delete('viracis_user_email')

  const url = new URL('/login', request.url)
  return NextResponse.redirect(url, { status: 303 })
}
