import { NextResponse } from 'next/server'
import { contactAPI } from '../../../src/utils/api'

// POST /api/contact  { name, email, subject, message } — Contact Us form
export async function POST(request) {
  try {
    const { name, email, subject, message } = await request.json()
    if (!name || !email || !message) {
      return NextResponse.json({ success: false, error: 'Name, email and message are required' }, { status: 400 })
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: 'Please enter a valid email address' }, { status: 400 })
    }
    const result = await contactAPI.createContact({ name, email, subject: subject || null, message })
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
    return NextResponse.json(
      { success: true, message: 'Success! Your details have been submitted successfully.', data: result.data },
      { status: 201 }
    )
  } catch (error) {
    console.error('Contact error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
