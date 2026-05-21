import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        setError('Lien invalide ou expiré. Veuillez vous reconnecter.')
        return
      }

      const userId = session.user.id
      const userEmail = session.user.email ?? ''

      // Charge ou crée le profil
      let { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (!profile) {
        // Première connexion client — crée le profil
        const { data: created, error: insertErr } = await supabase
          .from('profiles')
          .insert({ id: userId, role: 'client', full_name: userEmail.split('@')[0] })
          .select('role')
          .single()

        if (insertErr || !created) {
          setError('Impossible de créer votre compte. Contactez ALT\'IN Expertises.')
          return
        }
        profile = created
      }

      if (profile.role === 'expert' || profile.role === 'admin') {
        navigate('/expert')
        return
      }

      // Cherche le dossier par client_id ou par email (première connexion)
      let { data: dossier } = await supabase
        .from('dossiers')
        .select('ref, id, client_id')
        .eq('client_id', userId)
        .eq('status', 'active')
        .order('opened_at', { ascending: false })
        .limit(1)
        .single()

      if (!dossier) {
        // Première connexion : le dossier n'est pas encore lié, cherche par email
        const { data: byEmail } = await supabase
          .from('dossiers')
          .select('ref, id, client_id')
          .eq('client_email', userEmail.toLowerCase())
          .is('client_id', null)
          .limit(1)
          .single()

        if (byEmail) {
          // Lie le dossier à ce client
          await supabase
            .from('dossiers')
            .update({ client_id: userId })
            .eq('id', byEmail.id)
          dossier = { ...byEmail, client_id: userId }
        }
      }

      if (dossier) {
        navigate(`/client/dossier/${dossier.ref}`)
      } else {
        navigate('/client/dossier')
      }
    }

    handleCallback()
  }, [navigate])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-paper-2">
        <div className="text-center max-w-sm">
          <p className="text-2xl mb-3">⚠️</p>
          <p className="font-semibold text-ink">{error}</p>
          <a
            href="/login"
            className="mt-4 inline-block text-sm text-primary hover:underline"
          >
            Retour à la connexion
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper-2">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-muted">Connexion en cours…</p>
      </div>
    </div>
  )
}
