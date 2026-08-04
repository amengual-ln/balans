import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useMovements } from '@/hooks/useMovements'

const mockUseAPI = vi.fn()

vi.mock('@/hooks/useAPI', () => ({
  get useAPI() {
    return mockUseAPI
  },
}))

describe('useMovements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAPI.mockReturnValue({
      data: [],
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    })
  })

  it('builds URL with date range params', () => {
    renderHook(() => useMovements('2024-01-01', '2024-01-31'))

    expect(mockUseAPI).toHaveBeenCalled()
    expect(mockUseAPI).toHaveBeenCalledWith(
      '/api/movements?desde=2024-01-01&hasta=2024-01-31&limit=500&offset=0'
    )
  })

  it('includes tarjeta_id param when provided', () => {
    renderHook(() => useMovements('2024-01-01', '2024-01-31', { tarjetaId: 'card-123' }))

    expect(mockUseAPI).toHaveBeenCalledWith(
      '/api/movements?desde=2024-01-01&hasta=2024-01-31&limit=500&offset=0&tarjeta_id=card-123'
    )
  })

  it('includes cuenta_id param when provided', () => {
    renderHook(() => useMovements('2024-01-01', '2024-01-31', { cuentaId: 'account-123' }))

    expect(mockUseAPI).toHaveBeenCalledWith(
      '/api/movements?desde=2024-01-01&hasta=2024-01-31&limit=500&offset=0&cuenta_id=account-123'
    )
  })

  it('does not include tarjeta_id when null', () => {
    renderHook(() => useMovements('2024-01-01', '2024-01-31', { tarjetaId: null }))

    expect(mockUseAPI).toHaveBeenCalledWith(
      '/api/movements?desde=2024-01-01&hasta=2024-01-31&limit=500&offset=0'
    )
  })

  it('returns empty array when data is undefined', () => {
    mockUseAPI.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    })

    const { result } = renderHook(() => useMovements('2024-01-01', '2024-01-31'))

    expect(result.current.movements).toEqual([])
  })

  it('returns movements from data', () => {
    const movements = [
      { id: '1', tipo: 'GASTO', monto: '100', descripcion: 'Test' },
    ]
    mockUseAPI.mockReturnValue({
      data: movements,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    })

    const { result } = renderHook(() => useMovements('2024-01-01', '2024-01-31'))

    expect(result.current.movements).toEqual(movements)
  })

  it('returns isLoading from useAPI', () => {
    mockUseAPI.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: vi.fn(),
    })

    const { result } = renderHook(() => useMovements('2024-01-01', '2024-01-31'))

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

    const { result } = renderHook(() => useMovements('2024-01-01', '2024-01-31'))

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

    const { result } = renderHook(() => useMovements('2024-01-01', '2024-01-31'))

    expect(result.current.mutate).toBe(mutate)
  })
})
