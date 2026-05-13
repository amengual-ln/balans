import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import useSWR from 'swr'
import { useDebts } from '@/hooks/useDebts'

vi.mock('swr')

const mockUseSWR = useSWR as ReturnType<typeof vi.fn>

describe('useDebts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns debts as empty array when data is undefined', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    } as ReturnType<typeof useSWR>)

    const { result } = renderHook(() => useDebts())

    expect(result.current.debts).toEqual([])
  })

  it('returns debts from data', () => {
    const debts = [
      { id: '1', tipo: 'PERSONAL', direccion: 'POR_PAGAR', monto_total: 1000, monto_pendiente: 500 },
    ]
    mockUseSWR.mockReturnValue({
      data: debts,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    } as ReturnType<typeof useSWR>)

    const { result } = renderHook(() => useDebts())

    expect(result.current.debts).toEqual(debts)
  })

  it('returns isLoading from useSWR', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: vi.fn(),
    } as ReturnType<typeof useSWR>)

    const { result } = renderHook(() => useDebts())

    expect(result.current.isLoading).toBe(true)
  })

  it('returns error from useSWR', () => {
    const error = new Error('Failed to fetch')
    mockUseSWR.mockReturnValue({
      data: undefined,
      error,
      isLoading: false,
      mutate: vi.fn(),
    } as ReturnType<typeof useSWR>)

    const { result } = renderHook(() => useDebts())

    expect(result.current.error).toBe(error)
  })

  it('returns mutate function', () => {
    const mutate = vi.fn()
    mockUseSWR.mockReturnValue({
      data: [],
      error: undefined,
      isLoading: false,
      mutate,
    } as ReturnType<typeof useSWR>)

    const { result } = renderHook(() => useDebts())

    expect(result.current.mutate).toBe(mutate)
  })

  it('calls useSWR with correct endpoint', () => {
    mockUseSWR.mockReturnValue({
      data: [],
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    } as ReturnType<typeof useSWR>)

    renderHook(() => useDebts())

    expect(mockUseSWR).toHaveBeenCalledWith('/api/deudas', expect.any(Function))
  })
})