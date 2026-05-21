import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export function ExpertNav() {
  const { profile, signOut } = useAuthStore()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${isActive ? 'text-primary' : 'text-muted hover:text-ink'}`

  return (
    <nav className="bg-paper border-b border-paper-2 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="ALT'IN" className="h-8 w-8 object-contain" />
          <span className="font-bold text-lg text-primary tracking-tight">
            ALT'IN<span className="text-accent">.</span>
          </span>
        </div>
        <NavLink to="/expert" end className={linkClass}>Aujourd'hui</NavLink>
        <NavLink to="/expert/dossiers" className={linkClass}>Dossiers</NavLink>
        <NavLink to="/expert/agenda" className={linkClass}>Agenda</NavLink>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
          {profile?.initials ?? 'HK'}
        </div>
        <span className="text-sm text-ink">{profile?.full_name}</span>
        <button onClick={handleSignOut} className="text-sm text-muted hover:text-ink transition-colors">
          Déconnexion
        </button>
      </div>
    </nav>
  )
}
