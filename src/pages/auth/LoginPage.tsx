import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'

type Mode = 'client' | 'expert'

const clientSchema = z.object({
  email: z.string().email('Email invalide'),
})

const expertSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

type ClientForm = z.infer<typeof clientSchema>
type ExpertForm = z.infer<typeof expertSchema>

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('client')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const clientForm = useForm<ClientForm>({ resolver: zodResolver(clientSchema) })
  const expertForm = useForm<ExpertForm>({ resolver: zodResolver(expertSchema) })

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
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return setError('Email ou mot de passe incorrect')
    navigate('/expert')
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
          {(['client', 'expert'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); setSent(false) }}
              className={`flex-1 py-2 rounded-sm text-sm font-medium transition-all ${
                mode === m
                  ? 'bg-paper text-ink shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {m === 'client' ? 'Espace client' : 'Espace expert'}
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

          {/* Expert — email + password */}
          {mode === 'expert' && (
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
        </div>
      </div>
    </div>
  )
}
