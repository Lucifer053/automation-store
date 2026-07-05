import { NextResponse } from 'next/server'
import { userAPI } from '../../../../src/utils/api'
import { authenticateRequest } from '../../middleware/auth'

// GET /api/auth/me — the logged-in user's profile (no password)
export async function GET(request) {
  const auth = await authenticateRequest(request)
  if (!auth.success) return NextResponse.json({ success: false, error: auth.error }, { status: 401 })

  const result = await userAPI.getUserById(auth.user.id)
  if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 500 })

  const { password, ...safe } = result.data
  return NextResponse.json({ success: true, data: safe })
}
