import { useEffect, useState } from 'react'
import { ClientNav } from '@/components/layout/ClientNav'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

export default function ClientProfilPage() {
  const { profile, loadProfile } = useAuthStore()
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifSms, setNotifSms] = useState(false)
  const [notifPush, setNotifPush] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile) {
      setNotifEmail(profile.notif_email)
      setNotifSms(profile.notif_sms)
      setNotifPush(profile.notif_push)
    }
  }, [profile])

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    await supabase.from('profiles').update({
      notif_email: notifEmail,
      notif_sms: notifSms,
      notif_push: notifPush,
    }).eq('id', profile.id)
    await loadProfile(profile.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const Toggle = ({ value, onChange, label, description }: { value: boolean; onChange: (v: boolean) => void; label: string; description: string }) => (
    <div className="flex items-center justify-between py-4 border-b border-paper-2 last:border-0">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-xs text-muted mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-primary' : 'bg-paper-2'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-paper-2">
      <ClientNav />
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        <h1 className="text-lg font-bold text-ink mb-4">Mon profil</h1>

        {/* Infos */}
        <div className="bg-paper rounded-lg border border-paper-2 p-5 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
              {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'}
            </div>
            <div>
              <p className="font-semibold text-ink">{profile?.full_name ?? 'Client'}</p>
              <p className="text-xs text-muted">Espace client ALT'IN</p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-paper rounded-lg border border-paper-2 p-5 mb-4">
          <h2 className="font-semibold text-ink mb-2 text-sm">Notifications</h2>
          <Toggle
            value={notifEmail ?? true}
            onChange={setNotifEmail}
            label="Notifications par email"
            description="Recevez un email à chaque avancement de votre dossier"
          />
          <Toggle
            value={notifPush}
            onChange={setNotifPush}
            label="Notifications dans l'application"
            description="Badge rouge sur l'onglet Messages lors d'un nouveau message"
          />
          <div className="mt-4 flex items-center gap-3">
            <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
              Enregistrer
            </Button>
            {saved && <span className="text-xs text-green-600">✓ Sauvegardé</span>}
          </div>
        </div>

        {/* Déconnexion */}
        <div className="bg-paper rounded-lg border border-paper-2 p-5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center text-red-500 border-red-200 hover:bg-red-50"
            onClick={async () => {
              await useAuthStore.getState().signOut()
              window.location.href = '/login'
            }}
          >
            Se déconnecter
          </Button>
        </div>
      </div>
    </div>
  )
}
