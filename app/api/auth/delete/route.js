import { NextResponse } from 'next/server'
import { userAPI } from '../../../../src/utils/api'
import { authenticateRequest } from '../../middleware/auth'

// DELETE /api/auth/delete — delete the authenticated account
// (automationexercise "Delete Account")
export async function DELETE(request) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 })
    }
    const result = await userAPI.deleteUser(auth.user.id)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
    return NextResponse.json({ success: true, message: 'Account deleted!' })
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
