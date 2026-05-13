import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCards } from '@/hooks/useCards'

const mockUseAPI = vi.fn()

vi.mock('@/hooks/useAPI', () => ({
  get useAPI() {
    return mockUseAPI
  },
}))

describe('useCards', () => {
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
    renderHook(() => useCards())

    expect(mockUseAPI).toHaveBeenCalled()
    expect(mockUseAPI).toHaveBeenCalledWith('/api/tarjetas')
  })

  it('returns empty array when data is undefined', () => {
    mockUseAPI.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    })

    const { result } = renderHook(() => useCards())

    expect(result.current.cards).toEqual([])
  })

  it('returns cards from data', () => {
    const cards = [
      {
        id: '1',
        nombre: 'Visa Galicia',
        tipo: 'VISA',
        moneda: 'ARS',
        limite_total: 100000,
        limite_comprometido: 20000,
        limite_disponible: 80000,
        activa: true,
      },
    ]
    mockUseAPI.mockReturnValue({
      data: cards,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    })

    const { result } = renderHook(() => useCards())

    expect(result.current.cards).toEqual(cards)
  })

  it('returns isLoading from useAPI', () => {
    mockUseAPI.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: vi.fn(),
    })

    const { result } = renderHook(() => useCards())

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

    const { result } = renderHook(() => useCards())

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

    const { result } = renderHook(() => useCards())

    expect(result.current.mutate).toBe(mutate)
  })
})