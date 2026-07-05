import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { userAPI } from '../../../../src/utils/api'
import { generateToken } from '../../middleware/auth'

// POST /api/auth/register  — create account (automationexercise "Signup")
export async function POST(request) {
  try {
    const body = await request.json()
    const { name, email, password } = body

    if (!name || !email || !password) {
      return NextResponse.json({ success: false, error: 'Name, email and password are required' }, { status: 400 })
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: 'Please enter a valid email address' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters long' }, { status: 400 })
    }

    const emailCheck = await userAPI.checkEmailExists(email)
    if (emailCheck.exists) {
      return NextResponse.json({ success: false, error: 'Email Address already exist!' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const result = await userAPI.createUser({
      name,
      email,
      password: hashedPassword,
      title: body.title || null,
      gender: body.gender || null,
      birth_day: body.birth_day || null,
      birth_month: body.birth_month || null,
      birth_year: body.birth_year || null,
      first_name: body.first_name || null,
      last_name: body.last_name || null,
      company: body.company || null,
      address1: body.address1 || null,
      address2: body.address2 || null,
      country: body.country || null,
      state: body.state || null,
      city: body.city || null,
      zipcode: body.zipcode || null,
      mobile_number: body.mobile_number || null,
    })

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }

    const token = generateToken(result.data.id, result.data.email)
    return NextResponse.json(
      {
        success: true,
        message: 'User created!',
        data: { user: { id: result.data.id, name: result.data.name, email: result.data.email }, token },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
