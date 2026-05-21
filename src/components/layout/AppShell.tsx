import { useEffect } from 'react'
import { useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { Role } from '@/types'

interface AppShellProps {
  requiredRole: Role
}

export function AppShell({ requiredRole }: AppShellProps) {
  const { profile, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (!profile) {
      navigate('/login')
      return
    }
    if (profile.role !== requiredRole && profile.role !== 'admin') {
      navigate('/login')
    }
  }, [profile, loading, requiredRole])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) return null

  return <Outlet />
}
