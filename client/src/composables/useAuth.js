import { useRouter } from 'vue-router'

const TOKEN_KEY = 'token'
const USERNAME_KEY = 'username'

export function useAuth() {
  const router = useRouter()

  function getToken() {
    return localStorage.getItem(TOKEN_KEY)
  }

  function getUsername() {
    return localStorage.getItem(USERNAME_KEY)
  }

  function isLoggedIn() {
    return !!getToken()
  }

  function saveSession(token, username) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USERNAME_KEY, username)
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USERNAME_KEY)
  }

  async function login(email, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Identifiants invalides')
    saveSession(data.token, data.username)
    return data
  }

  async function register(username, email, password) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || "Erreur lors de l'inscription")
    return data
  }

  function logout() {
    clearSession()
    router.push('/login')
  }

  return { getToken, getUsername, isLoggedIn, login, register, logout, saveSession, clearSession }
}
