import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  email: z.string().email('Email invalide'),
})
type Form = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async ({ email }: Form) => {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })
    setLoading(false)
    if (error) return setError(error.message)
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-paper-2 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-display font-bold text-2xl text-primary tracking-tight">
            ALT'IN<span className="text-accent">.</span>
          </p>
          <p className="text-sm text-muted mt-1">Réinitialisation du mot de passe</p>
        </div>

        <div className="bg-paper rounded-md border border-paper-2 p-6 shadow-sm">
          {sent ? (
            <div className="text-center py-4">
              <p className="text-2xl mb-3">📬</p>
              <p className="font-semibold text-ink">Email envoyé</p>
              <p className="text-sm text-muted mt-2">
                Consultez votre boîte mail pour réinitialiser votre mot de passe.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <p className="text-sm text-muted">
                Entrez votre adresse email expert et nous vous enverrons un lien de réinitialisation.
              </p>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Email</label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="expert@altin-expertises.fr"
                  className="w-full px-3 py-2 rounded-sm border border-paper-2 bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
                )}
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-primary text-white rounded-sm text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Envoi…' : 'Envoyer le lien'}
              </button>
              <a href="/login" className="block text-center text-sm text-primary hover:underline">
                Retour à la connexion
              </a>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
