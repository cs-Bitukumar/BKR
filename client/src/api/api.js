const DEFAULT_API_URL = 'http://localhost:4000'
export const API_BASE_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/+$/, '')

export function buildApiUrl(path) {
  if (!path) return API_BASE_URL
  if (/^https?:\/\//i.test(path)) return path.replace(/\/+$/, '')
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

async function request(path, options = {}, token) {
  const url = buildApiUrl(path)
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || 'Request failed')
  return data
}

export async function post(path, body, token) {
  return request(
    path,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
    token,
  )
}

export async function get(path, token) {
  return request(path, { method: 'GET' }, token)
}

export async function put(path, body, token) {
  return request(
    path,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
    token,
  )
}

export async function patch(path, body, token) {
  return request(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, token)
}
