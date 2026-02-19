import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'rehabvet-dev-secret-change-in-production'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'vet' | 'therapist' | 'receptionist'
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hashSync(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compareSync(password, hash)
}

export function createToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' })
}

export function verifyToken(token: string): AuthUser | null {
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
