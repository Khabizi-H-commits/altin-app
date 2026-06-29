import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export default function PendingPage() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuthStore()

  // Si l'admin a validé le compte entre-temps, on redirige vers l'espace.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/login')
    })
  }, [navigate])

  useEffect(() => {
    if (profile?.role === 'partenaire') navigate('/partenaire')
    if (profile?.role === 'expert' || profile?.role === 'admin') navigate('/expert')
  }, [profile?.role, navigate])

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  return (
    <div className="min-h-screen bg-paper-2 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <img src="/logo.png" alt="ALT'IN" className="h-14 w-14 object-contain mx-auto mb-4" />
        <div className="bg-paper rounded-md border border-paper-2 p-8 shadow-sm">
          <p className="text-3xl mb-3">⏳</p>
          <h1 className="font-display font-bold text-lg text-primary mb-2">
            Compte en attente de validation
          </h1>
          <p className="text-sm text-muted">
            Votre demande de compte partenaire a bien été enregistrée. Un administrateur
            ALT'IN doit la valider avant que vous puissiez accéder à votre espace.
          </p>
          <p className="text-sm text-muted mt-3">
            Vous recevrez l'accès dès l'activation. Merci de votre patience.
          </p>
          <button
            onClick={handleSignOut}
            className="mt-6 text-sm text-primary hover:underline"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  )
}
