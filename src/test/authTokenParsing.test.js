import { describe, it, expect } from 'vitest'

/**
 * Token extraction logic mirrors client.js + auth.js handling.
 * Backend returns: { message, data: { access_token, refresh_token } }
 * client.js unwraps first data layer, so login gets: { access_token, ... }
 * BUT refresh path may have double-nesting depending on endpoint.
 */
function extractTokens(responseBody) {
  const tokenData = responseBody?.data ?? responseBody
  return {
    accessToken: tokenData?.access_token || tokenData?.token || tokenData?.accessToken || null,
    refreshToken: tokenData?.refresh_token || tokenData?.refreshToken || null,
  }
}

describe('extractTokens — login / refresh response parsing', () => {
  it('extracts from flat response { access_token, refresh_token }', () => {
    const res = { access_token: 'acc_123', refresh_token: 'ref_456' }
    expect(extractTokens(res)).toEqual({ accessToken: 'acc_123', refreshToken: 'ref_456' })
  })

  it('extracts from nested { data: { access_token } } (double-wrapped)', () => {
    const res = { data: { access_token: 'acc_123', refresh_token: 'ref_456' } }
    expect(extractTokens(res)).toEqual({ accessToken: 'acc_123', refreshToken: 'ref_456' })
  })

  it('accepts camelCase accessToken field', () => {
    const res = { accessToken: 'acc_abc', refreshToken: 'ref_xyz' }
    expect(extractTokens(res)).toEqual({ accessToken: 'acc_abc', refreshToken: 'ref_xyz' })
  })

  it('accepts token field as fallback for access_token', () => {
    const res = { token: 'acc_tok', refresh_token: 'ref_tok' }
    expect(extractTokens(res)).toEqual({ accessToken: 'acc_tok', refreshToken: 'ref_tok' })
  })

  it('returns null when response is null or empty', () => {
    expect(extractTokens(null)).toEqual({ accessToken: null, refreshToken: null })
    expect(extractTokens({})).toEqual({ accessToken: null, refreshToken: null })
  })

  it('returns null refreshToken when only access token present', () => {
    const res = { access_token: 'acc_only' }
    expect(extractTokens(res)).toEqual({ accessToken: 'acc_only', refreshToken: null })
  })
})
