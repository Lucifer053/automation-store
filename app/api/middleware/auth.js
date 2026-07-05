// Authentication middleware helper (demo token, same pattern as vibeboard).
// Token format: base64("<userId>:<email>")

export async function authenticateRequest(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'No authorization header provided' }
    }
    const token = authHeader.substring(7)
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8')
      const [userId, email] = decoded.split(':')
      if (!userId || !email) {
        return { success: false, error: 'Invalid token format' }
      }
      return { success: true, user: { id: parseInt(userId), email } }
    } catch (error) {
      return { success: false, error: 'Invalid token' }
    }
  } catch (error) {
    return { success: false, error: 'Authentication failed' }
  }
}

export function generateToken(userId, email) {
  return Buffer.from(`${userId}:${email}`).toString('base64')
}
