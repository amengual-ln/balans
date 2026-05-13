import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useStats } from '@/hooks/useStats'

const mockUseAPI = vi.fn()

vi.mock('@/hooks/useAPI', () => ({
  get useAPI() {
    return mockUseAPI
  },
}))

describe('useStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAPI.mockReturnValue({
      data: null,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    })
  })

  it('builds URL with date range params', () => {
    renderHook(() => useStats('2024-01-01', '2024-01-31'))

    expect(mockUseAPI).toHaveBeenCalled()
    expect(mockUseAPI).toHaveBeenCalledWith(
      '/api/movements/stats?desde=2024-01-01&hasta=2024-01-31'
    )
  })

  it('returns null when data is undefined', () => {
    mockUseAPI.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    })

    const { result } = renderHook(() => useStats('2024-01-01', '2024-01-31'))

    expect(result.current.stats).toBeNull()
  })

  it('returns stats from data', () => {
    const stats = { ingresos: 5000, gastos: 3000, balance: 2000 }
    mockUseAPI.mockReturnValue({
      data: stats,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    })

    const { result } = renderHook(() => useStats('2024-01-01', '2024-01-31'))

    expect(result.current.stats).toEqual(stats)
  })

  it('returns isLoading from useAPI', () => {
    mockUseAPI.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: vi.fn(),
    })

    const { result } = renderHook(() => useStats('2024-01-01', '2024-01-31'))

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

    const { result } = renderHook(() => useStats('2024-01-01', '2024-01-31'))

    expect(result.current.error).toBe(error)
  })

  it('returns mutate function', () => {
    const mutate = vi.fn()
    mockUseAPI.mockReturnValue({
      data: null,
      error: undefined,
      isLoading: false,
      mutate,
    })

    const { result } = renderHook(() => useStats('2024-01-01', '2024-01-31'))

    expect(result.current.mutate).toBe(mutate)
  })
})