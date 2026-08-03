export async function apiRequest(input: RequestInfo | URL, init: RequestInit = {}) {
  const response = await window.fetch(input, { ...init, credentials: 'include' })
  if (response.status === 428) window.location.assign('/change-password')
  if (response.status === 401) window.location.assign('/login')
  return response
}

export const jsonHeaders = { 'Content-Type': 'application/json' }
