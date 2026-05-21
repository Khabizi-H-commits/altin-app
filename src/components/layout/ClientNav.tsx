import { useEffect, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

export function ClientNav() {
  const { profile, signOut } = useAuthStore()
  const { ref } = useParams<{ ref: string }>()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  useEffect(() => {
    if (!profile) return

    const loadUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .is('read_at', null)
      setUnreadCount(count ?? 0)
    }

    loadUnread()

    const channel = supabase
      .channel(`notifs-${profile.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        () => loadUnread())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        () => loadUnread())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile?.id])

  const base = ref ? `/client/dossier/${ref}` : '/client'

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center gap-0.5 px-4 py-2 text-xs font-medium transition-colors ${
      isActive ? 'text-primary' : 'text-muted'
    }`

  return (
    <>
      {/* Header mobile */}
      <header className="bg-paper border-b border-paper-2 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="ALT'IN" className="h-7 w-7 object-contain" />
          <span className="font-bold text-base text-primary tracking-tight">
            ALT'IN<span className="text-accent">.</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">{profile?.full_name}</span>
          <button onClick={handleSignOut} className="text-xs text-muted hover:text-ink">
            Déconnexion
          </button>
        </div>
      </header>

      {/* Bottom nav mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-paper border-t border-paper-2 flex z-10 safe-area-inset-bottom">
        <NavLink to={base} end className={linkClass}>
          <span className="text-lg">📋</span>
          Mon dossier
        </NavLink>
        <NavLink to={`${base}/documents`} className={linkClass}>
          <span className="text-lg">📎</span>
          Documents
        </NavLink>
        <NavLink to={`${base}/messages`} className={linkClass}>
          <span className="relative text-lg">
            💬
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[16px] h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold px-0.5">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </span>
          Messages
        </NavLink>
        <NavLink to="/client/profil" className={linkClass}>
          <span className="text-lg">⚙️</span>
          Profil
        </NavLink>
      </nav>
    </>
  )
}
