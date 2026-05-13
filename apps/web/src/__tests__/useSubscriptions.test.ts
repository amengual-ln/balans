import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSubscriptions } from '@/hooks/useSubscriptions'

const mockUseAPI = vi.fn()

vi.mock('@/hooks/useAPI', () => ({
  get useAPI() {
    return mockUseAPI
  },
}))

describe('useSubscriptions', () => {
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
    renderHook(() => useSubscriptions())

    expect(mockUseAPI).toHaveBeenCalled()
    expect(mockUseAPI).toHaveBeenCalledWith('/api/suscripciones')
  })

  it('returns empty array when data is undefined', () => {
    mockUseAPI.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    })

    const { result } = renderHook(() => useSubscriptions())

    expect(result.current.subscriptions).toEqual([])
  })

  it('returns subscriptions from data', () => {
    const subscriptions = [
      {
        id: '1',
        nombre: 'Netflix',
        monto: 1000,
        moneda: 'ARS',
        frecuencia: 'MENSUAL',
        dia_pago: 15,
        activo: true,
      },
    ]
    mockUseAPI.mockReturnValue({
      data: subscriptions,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    })

    const { result } = renderHook(() => useSubscriptions())

    expect(result.current.subscriptions).toEqual(subscriptions)
  })

  it('returns isLoading from useAPI', () => {
    mockUseAPI.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: vi.fn(),
    })

    const { result } = renderHook(() => useSubscriptions())

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

    const { result } = renderHook(() => useSubscriptions())

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

    const { result } = renderHook(() => useSubscriptions())

    expect(result.current.mutate).toBe(mutate)
  })
})