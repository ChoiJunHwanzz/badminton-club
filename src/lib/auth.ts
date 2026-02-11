export interface User {
  id: string
  username: string
  role: 'admin' | 'manager'
  name: string
}

export const getUser = (): User | null => {
  if (typeof window === 'undefined') return null
  const user = localStorage.getItem('user')
  return user ? JSON.parse(user) : null
}

export const logout = () => {
  localStorage.removeItem('user')
  window.location.href = '/login'
}

export const isLoggedIn = (): boolean => {
  return getUser() !== null
}
