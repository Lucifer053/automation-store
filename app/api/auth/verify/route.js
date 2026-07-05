import { NextResponse } from 'next/server'
import { userAPI } from '../../../../src/utils/api'

// POST /api/auth/verify — check if an email is already registered
// (mirrors automationexercise "verifyLogin": tells signup whether email exists)
export async function POST(request) {
  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 })
    }
    const { exists } = await userAPI.checkEmailExists(email)
    return NextResponse.json({
      success: true,
      data: { exists },
      message: exists ? 'User exists!' : 'User not found!',
    })
  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
