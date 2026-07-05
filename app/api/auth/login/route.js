import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { userAPI } from '../../../../src/utils/api'
import { generateToken } from '../../middleware/auth'

// POST /api/auth/login
export async function POST(request) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 })
    }

    const result = await userAPI.getUserByEmail(email)
    if (!result.success) {
      return NextResponse.json({ success: false, error: 'Your email or password is incorrect!' }, { status: 401 })
    }

    const ok = await bcrypt.compare(password, result.data.password)
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Your email or password is incorrect!' }, { status: 401 })
    }

    const user = result.data
    const token = generateToken(user.id, user.email)
    return NextResponse.json({
      success: true,
      data: { user: { id: user.id, name: user.name, email: user.email }, token },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
