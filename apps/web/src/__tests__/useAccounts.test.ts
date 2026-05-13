import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAccounts } from '@/hooks/useAccounts'

const mockUseAPI = vi.fn()

vi.mock('@/hooks/useAPI', () => ({
  get useAPI() {
    return mockUseAPI
  },
}))

describe('useAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAPI.mockReturnValue({
      data: [],
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    })
  })

  it('calls useAPI with correct endpoint', () => {
    renderHook(() => useAccounts())

    expect(mockUseAPI).toHaveBeenCalled()
    expect(mockUseAPI).toHaveBeenCalledWith('/api/cuentas')
  })

  it('returns empty array when data is undefined', () => {
    mockUseAPI.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    })

    const { result } = renderHook(() => useAccounts())

    expect(result.current.accounts).toEqual([])
  })

  it('returns accounts from data', () => {
    const accounts = [
      { id: '1', nombre: 'Banco Galicia', tipo: 'BANCO', moneda: 'ARS', saldo_actual: 10000, activa: true },
    ]
    mockUseAPI.mockReturnValue({
      data: accounts,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    })

    const { result } = renderHook(() => useAccounts())

    expect(result.current.accounts).toEqual(accounts)
  })

  it('returns isLoading from useAPI', () => {
    mockUseAPI.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: vi.fn(),
    })

    const { result } = renderHook(() => useAccounts())

    expect(result.current.isLoading).toBe(true)
  })

  it('returns error from useAPI', () => {
    const error = new Error('Failed')
    mockUseAPI.mockReturnValue({
      data: undefined,
      error,
      isLoading: false,
      mutate: vi.fn(),
    })

    const { result } = renderHook(() => useAccounts())

    expect(result.current.error).toBe(error)
  })

  it('returns mutate function', () => {
    const mutate = vi.fn()
    mockUseAPI.mockReturnValue({
      data: [],
      error: undefined,
      isLoading: false,
      mutate,
    })

    const { result } = renderHook(() => useAccounts())

    expect(result.current.mutate).toBe(mutate)
  })
})