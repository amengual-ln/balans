import useSWR, { type SWRConfiguration, type SWRResponse } from 'swr';

const USER_ID = import.meta.env.VITE_USER_ID ?? 'demo-user-id';

export const apiFetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url, {
    headers: { 'x-user-id': USER_ID },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Error ${res.status}`);
  }
  const json = await res.json();
  return json.data ?? json;
};

export function useAPI<T>(
  key: string | null,
  config?: SWRConfiguration<T>,
): SWRResponse<T> {
  return useSWR<T>(key, apiFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
    ...config,
  });
}

export async function apiPost<T = unknown>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': USER_ID,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(json.error ?? 'Error al guardar');
  }
  return res.json() as Promise<T>;
}

export async function apiPut<T = unknown>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': USER_ID,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(json.error ?? 'Error al actualizar');
  }
  return res.json() as Promise<T>;
}

export async function apiDelete<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 'x-user-id': USER_ID },
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(json.error ?? 'Error al eliminar');
  }
  return res.json() as Promise<T>;
}

export async function apiPatch<T = unknown>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': USER_ID,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(json.error ?? 'Error al actualizar');
  }
  return res.json() as Promise<T>;
}

export { USER_ID };
