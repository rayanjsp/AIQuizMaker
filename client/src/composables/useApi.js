import { useAuth } from './useAuth'

export function useApi() {
  const { getToken } = useAuth()

  function getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    }
  }

  async function authFetch(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...(options.headers || {}),
      },
    })
    return res
  }

  return { getToken, getAuthHeaders, authHeaders: getAuthHeaders, authFetch }
}
