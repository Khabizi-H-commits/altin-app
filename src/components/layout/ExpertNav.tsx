import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { basePathForRole } from '@/lib/space'

export function ExpertNav() {
  const { profile, signOut } = useAuthStore()
  const navigate = useNavigate()

  const isPartenaire = profile?.role === 'partenaire'
  const isAdmin = profile?.role === 'admin'
  const base = basePathForRole(profile?.role)

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
          <a href="https://altin-expertises.fr" className="text-xs text-muted hover:text-ink flex items-center gap-1 mr-2">
            ← Site
          </a>
          <img src="/logo.png" alt="ALT'IN" className="h-8 w-8 object-contain" />
          <span className="font-bold text-lg text-primary tracking-tight">
            ALT'IN<span className="text-accent">.</span>
          </span>
          {isPartenaire && (
            <span className="ml-1 text-[11px] font-semibold uppercase tracking-wide text-accent bg-accent/10 px-2 py-0.5 rounded-full">
              Partenaire
            </span>
          )}
        </div>
        <NavLink to={base} end className={linkClass}>Aujourd'hui</NavLink>
        <NavLink to={`${base}/dossiers`} className={linkClass}>Dossiers</NavLink>
        {!isPartenaire && <NavLink to={`${base}/agenda`} className={linkClass}>Agenda</NavLink>}
        {!isPartenaire && <NavLink to={`${base}/formations`} className={linkClass}>Formations</NavLink>}
        {isAdmin && <NavLink to="/admin/partenaires" className={linkClass}>Partenaires</NavLink>}
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
