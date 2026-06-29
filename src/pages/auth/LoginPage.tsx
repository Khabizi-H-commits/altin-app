import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { basePathForRole } from '@/lib/space'

type Mode = 'client' | 'expert' | 'partenaire'

const MODE_LABELS: Record<Mode, string> = {
  client: 'Espace client',
  expert: 'Espace expert',
  partenaire: 'Espace partenaire',
}

const clientSchema = z.object({
  email: z.string().email('Email invalide'),
})

const expertSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

const signupSchema = z.object({
  full_name: z.string().min(2, 'Nom requis'),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, '8 caractères minimum'),
})

type ClientForm = z.infer<typeof clientSchema>
type ExpertForm = z.infer<typeof expertSchema>
type SignupForm = z.infer<typeof signupSchema>

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('client')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const [partnerSignup, setPartnerSignup] = useState(false)
  const [signupDone, setSignupDone] = useState(false)

  const clientForm = useForm<ClientForm>({ resolver: zodResolver(clientSchema) })
  const expertForm = useForm<ExpertForm>({ resolver: zodResolver(expertSchema) })
  const signupForm = useForm<SignupForm>({ resolver: zodResolver(signupSchema) })

  const handlePartnerSignup = async ({ full_name, email, password }: SignupForm) => {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name, role_request: 'partenaire' } },
    })
    setLoading(false)
    if (error) return setError(error.message)
    setSignupDone(true)
  }

  const handleClientSubmit = async ({ email }: ClientForm) => {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (error) return setError(error.message)
    setSent(true)
  }

  const handleExpertSubmit = async ({ email, password }: ExpertForm) => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      setLoading(false)
      return setError('Email ou mot de passe incorrect')
    }
    // Aiguillage selon le rôle réel du compte (et non l'onglet choisi).
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', data.user.id).single()
    setLoading(false)
    // Compte partenaire en attente de validation par l'admin.
    if (profile?.role === 'pending') return navigate('/attente')
    // L'admin utilise l'Espace expert (où il voit/édite tous les dossiers).
    navigate(basePathForRole(profile?.role))
  }

  return (
    <div className="min-h-screen bg-paper-2 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="ALT'IN" className="h-16 w-16 object-contain mx-auto mb-3" />
          <p className="font-display font-bold text-2xl text-primary tracking-tight">
            ALT'IN<span className="text-accent">.</span>
          </p>
          <p className="text-sm text-muted mt-1">Mon espace</p>
        </div>

        {/* Mode switcher */}
        <div className="flex bg-paper-2 rounded-md p-1 mb-6 border border-paper-2">
          {(['client', 'expert', 'partenaire'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); setSent(false); setPartnerSignup(false); setSignupDone(false) }}
              className={`flex-1 py-2 px-1 rounded-sm text-xs sm:text-sm font-medium transition-all ${
                mode === m
                  ? 'bg-paper text-ink shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        <div className="bg-paper rounded-md border border-paper-2 p-6 shadow-sm">

          {/* Client — magic link */}
          {mode === 'client' && (
            <>
              {sent ? (
                <div className="text-center py-4">
                  <p className="text-2xl mb-3">📬</p>
                  <p className="font-semibold text-ink">Lien envoyé !</p>
                  <p className="text-sm text-muted mt-2">
                    Vérifiez votre boîte mail et cliquez sur le lien pour accéder à votre espace.
                  </p>
                </div>
              ) : (
                <form onSubmit={clientForm.handleSubmit(handleClientSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">
                      Adresse email
                    </label>
                    <input
                      {...clientForm.register('email')}
                      type="email"
                      placeholder="votre@email.fr"
                      className="w-full px-3 py-2 rounded-sm border border-paper-2 bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                    {clientForm.formState.errors.email && (
                      <p className="text-xs text-red-500 mt-1">
                        {clientForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-primary text-white rounded-sm text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {loading ? 'Envoi…' : 'Recevoir mon lien de connexion'}
                  </button>
                </form>
              )}
            </>
          )}

          {/* Expert / Partenaire (connexion) — email + password */}
          {(mode === 'expert' || (mode === 'partenaire' && !partnerSignup)) && (
            <form onSubmit={expertForm.handleSubmit(handleExpertSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Email</label>
                <input
                  {...expertForm.register('email')}
                  type="email"
                  placeholder="expert@altin-expertises.fr"
                  className="w-full px-3 py-2 rounded-sm border border-paper-2 bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                {expertForm.formState.errors.email && (
                  <p className="text-xs text-red-500 mt-1">
                    {expertForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm font-medium text-ink">Mot de passe</label>
                  <a href="/auth/forgot-password" className="text-xs text-primary hover:underline">
                    Oublié ?
                  </a>
                </div>
                <input
                  {...expertForm.register('password')}
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-sm border border-paper-2 bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                {expertForm.formState.errors.password && (
                  <p className="text-xs text-red-500 mt-1">
                    {expertForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-primary text-white rounded-sm text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Connexion…' : 'Se connecter'}
              </button>
            </form>
          )}

          {/* Partenaire — création de compte */}
          {mode === 'partenaire' && partnerSignup && (
            signupDone ? (
              <div className="text-center py-4">
                <p className="text-2xl mb-3">⏳</p>
                <p className="font-semibold text-ink">Demande envoyée !</p>
                <p className="text-sm text-muted mt-2">
                  Votre compte partenaire a été créé. Il sera actif dès qu'ALT'IN l'aura
                  validé — vous pourrez alors vous connecter.
                </p>
              </div>
            ) : (
              <form onSubmit={signupForm.handleSubmit(handlePartnerSignup)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Nom complet</label>
                  <input {...signupForm.register('full_name')} type="text" placeholder="Jean Dupont"
                    className="w-full px-3 py-2 rounded-sm border border-paper-2 bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                  {signupForm.formState.errors.full_name && <p className="text-xs text-red-500 mt-1">{signupForm.formState.errors.full_name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Email</label>
                  <input {...signupForm.register('email')} type="email" placeholder="vous@exemple.fr"
                    className="w-full px-3 py-2 rounded-sm border border-paper-2 bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                  {signupForm.formState.errors.email && <p className="text-xs text-red-500 mt-1">{signupForm.formState.errors.email.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Mot de passe (8 caractères min.)</label>
                  <input {...signupForm.register('password')} type="password" placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-sm border border-paper-2 bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                  {signupForm.formState.errors.password && <p className="text-xs text-red-500 mt-1">{signupForm.formState.errors.password.message}</p>}
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 bg-primary text-white rounded-sm text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                  {loading ? 'Création…' : 'Créer mon compte partenaire'}
                </button>
              </form>
            )
          )}

          {/* Bascule connexion / inscription (onglet partenaire seulement) */}
          {mode === 'partenaire' && !signupDone && (
            <p className="text-center text-xs text-muted mt-4">
              {partnerSignup ? 'Vous avez déjà un compte ? ' : 'Pas encore partenaire ? '}
              <button
                type="button"
                onClick={() => { setPartnerSignup(!partnerSignup); setError(null) }}
                className="text-primary font-medium hover:underline"
              >
                {partnerSignup ? 'Se connecter' : 'Créer un compte'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
