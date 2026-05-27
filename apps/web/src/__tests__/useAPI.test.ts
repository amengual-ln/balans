import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiFetcher, apiPost, apiPut, apiDelete, apiPatch, USER_ID } from '@/hooks/useAPI'

vi.mock('swr', () => ({
  default: vi.fn(),
  mutate: vi.fn(),
}))

const fetchSpy = vi.spyOn(global, 'fetch')

const mockResponse = (data: unknown, ok = true, status = 200) => {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue({ data }),
  } as unknown as Response
}

describe('useAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    fetchSpy.mockReset()
  })

  describe('apiFetcher', () => {
    it('returns json.data when available', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse({ foo: 'bar' }))
      const result = await apiFetcher<{ foo: string }>('/api/test')
      expect(result).toEqual({ foo: 'bar' })
    })

    it('returns json directly when data is not present', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse({ foo: 'bar' }))
      await apiFetcher<{ foo: string }>('/api/test')
      expect(fetchSpy).toHaveBeenCalledWith('/api/test', {
        headers: { 'x-user-id': USER_ID },
      })
    })

    it('throws Error with message on non-ok response', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: vi.fn().mockResolvedValue({ error: 'Not found' }),
      } as unknown as Response)

      await expect(apiFetcher('/api/test')).rejects.toThrow('Not found')
    })

    it('throws Error with status code when no error message', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({}),
      } as unknown as Response)

      await expect(apiFetcher('/api/test')).rejects.toThrow('Error 500')
    })

    it('throws Error when json parsing fails', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: vi.fn().mockRejectedValue(new Error('parse error')),
      } as unknown as Response)

      await expect(apiFetcher('/api/test')).rejects.toThrow('Error 400')
    })
  })

  describe('apiPost', () => {
    it('sends POST request with correct headers and body', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse({ id: '1' }))

      const result = await apiPost('/api/cuentas', { nombre: 'Test' })

      expect(fetchSpy).toHaveBeenCalledWith('/api/cuentas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': USER_ID,
        },
        body: JSON.stringify({ nombre: 'Test' }),
      })
      expect(result).toEqual({ data: { id: '1' } })
    })

    it('throws Error on non-ok response', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({ error: 'Validation error' }),
      } as unknown as Response)

      await expect(apiPost('/api/cuentas', {})).rejects.toThrow('Validation error')
    })
  })

  describe('apiPut', () => {
    it('sends PUT request with correct headers and body', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse({ id: '1' }))

      await apiPut('/api/cuentas/1', { nombre: 'Updated' })

      expect(fetchSpy).toHaveBeenCalledWith('/api/cuentas/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': USER_ID,
        },
        body: JSON.stringify({ nombre: 'Updated' }),
      })
    })

    it('throws Error on non-ok response', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: vi.fn().mockResolvedValue({ error: 'Not found' }),
      } as unknown as Response)

      await expect(apiPut('/api/cuentas/999', {})).rejects.toThrow('Not found')
    })
  })

  describe('apiDelete', () => {
    it('sends DELETE request with correct headers', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse({ success: true }))

      await apiDelete('/api/cuentas/1')

      expect(fetchSpy).toHaveBeenCalledWith('/api/cuentas/1', {
        method: 'DELETE',
        headers: { 'x-user-id': USER_ID },
      })
    })

    it('throws Error on non-ok response', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: vi.fn().mockResolvedValue({ error: 'Not found' }),
      } as unknown as Response)

      await expect(apiDelete('/api/cuentas/999')).rejects.toThrow('Not found')
    })
  })

  describe('apiPatch', () => {
    it('sends PATCH request with correct headers and body', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse({ id: '1' }))

      await apiPatch('/api/movements/1', { descripcion: 'Updated' })

      expect(fetchSpy).toHaveBeenCalledWith('/api/movements/1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': USER_ID,
        },
        body: JSON.stringify({ descripcion: 'Updated' }),
      })
    })

    it('throws Error on non-ok response', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({ error: 'Error al actualizar' }),
      } as unknown as Response)

      await expect(apiPatch('/api/movements/1', {})).rejects.toThrow('Error al actualizar')
    })
  })
})