import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useInversiones } from '@/hooks/useInversiones'

const mockUseAPI = vi.fn()

vi.mock('@/hooks/useAPI', () => ({
  get useAPI() {
    return mockUseAPI
  },
}))

describe('useInversiones', () => {
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
    renderHook(() => useInversiones())

    expect(mockUseAPI).toHaveBeenCalled()
    expect(mockUseAPI).toHaveBeenCalledWith('/api/inversiones')
  })

  it('returns empty array when data is undefined', () => {
    mockUseAPI.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    })

    const { result } = renderHook(() => useInversiones())

    expect(result.current.inversiones).toEqual([])
  })

  it('returns inversiones from data', () => {
    const inversiones = [
      {
        ticker: 'AAPL',
        tipo: 'ACCIONES',
        moneda: 'USD',
        tipo_liquidez: 'DIAS',
        lotes: [],
        total_invertido: 10000,
        total_recuperado: 0,
        cantidad_total: 10,
        most_recent_lote_id: '1',
        estado: 'ACTIVA',
      },
    ]
    mockUseAPI.mockReturnValue({
      data: inversiones,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    })

    const { result } = renderHook(() => useInversiones())

    expect(result.current.inversiones).toEqual(inversiones)
  })

  it('returns isLoading from useAPI', () => {
    mockUseAPI.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: vi.fn(),
    })

    const { result } = renderHook(() => useInversiones())

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

    const { result } = renderHook(() => useInversiones())

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

    const { result } = renderHook(() => useInversiones())

    expect(result.current.mutate).toBe(mutate)
  })
})