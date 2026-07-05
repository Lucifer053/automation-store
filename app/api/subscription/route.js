import { NextResponse } from 'next/server'
import { subscriptionAPI } from '../../../src/utils/api'

// POST /api/subscription  { email } — newsletter subscribe (footer)
export async function POST(request) {
  try {
    const { email } = await request.json()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: 'Please enter a valid email address' }, { status: 400 })
    }
    const result = await subscriptionAPI.subscribe(email)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
    return NextResponse.json({ success: true, message: 'You have been successfully subscribed!' }, { status: 201 })
  } catch (error) {
    console.error('Subscription error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
