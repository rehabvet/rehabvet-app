/**
 * In-app error capture — writes to app_errors table for automated monitoring & fixing.
 */

import { prisma } from './prisma'
import { NextRequest } from 'next/server'

export async function logError(opts: {
  route: string
  method?: string
  error: unknown
  userId?: string
  requestBody?: unknown
}) {
  const err = opts.error instanceof Error ? opts.error : new Error(String(opts.error))
  const code = (err as any)?.code || (err as any)?.status || null

  try {
    await prisma.$queryRawUnsafe(
      `INSERT INTO app_errors (route, method, error_code, error_message, stack, user_id, request_body)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      opts.route,
      opts.method || 'UNKNOWN',
      code ? String(code) : null,
      err.message?.slice(0, 2000) || 'Unknown error',
      err.stack?.slice(0, 4000) || null,
      opts.userId || null,
      opts.requestBody ? JSON.stringify(opts.requestBody) : null,
    )
  } catch {
    // Don't let error logging crash the app
  }
}

/**
 * Wrap an API route handler with automatic error capture.
 * Usage: export const POST = withErrorCapture('/api/my-route', async (req) => { ... })
 */
export function withErrorCapture(
  route: string,
  handler: (req: NextRequest, ctx?: any) => Promise<Response>
) {
  return async (req: NextRequest, ctx?: any): Promise<Response> => {
    try {
      return await handler(req, ctx)
    } catch (e: any) {
      await logError({ route, method: req.method, error: e })
      const { NextResponse } = await import('next/server')
      return NextResponse.json(
        { error: e?.message || 'Internal server error' },
        { status: 500 }
      )
    }
  }
}
