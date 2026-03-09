import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Throws if error is present, or if data is null.
 * Use after .select().eq().single() — PGRST116 becomes a friendly "not found" error.
 */
export function assertSuccess<T>(
  data: T | null,
  error: PostgrestError | null,
  notFoundMsg = 'Not found',
): T {
  if (error) {
    if (error.code === 'PGRST116') throw new Error(notFoundMsg)
    throw new Error(error.message ?? 'Database error')
  }
  if (data === null) throw new Error(notFoundMsg)
  return data
}

/**
 * Throws if error is present.
 * Use after .insert()/.update()/.delete() / .rpc() — operations that return no data.
 */
export function assertOk(error: PostgrestError | null | undefined): void {
  if (error) throw new Error(error.message ?? 'Database error')
}
