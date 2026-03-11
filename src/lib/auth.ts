import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'rehabvet-dev-secret-local-only')

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function createToken(user: AuthUser): string {
  if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable must be set')
  return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' })
}

export function verifyToken(token: string): AuthUser | null {
  if (!JWT_SECRET) {
    console.error('[auth] JWT_SECRET not set — rejecting token')
    return null
  }
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser
  } catch {
    return null
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  if (!token) return null
  return verifyToken(token)
}
