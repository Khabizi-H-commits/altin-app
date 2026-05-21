// Phase 5 — Edge Function Supabase : envoi email via Resend
// Déclenchée par un Database Webhook sur INSERT INTO notifications
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_KEY = Deno.env.get('RESEND_API_KEY')!

serve(async (req) => {
  const { record } = await req.json()
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: profile } = await sb
    .from('profiles')
    .select('full_name, notif_email')
    .eq('id', record.user_id)
    .single()

  const { data: user } = await sb.auth.admin.getUserById(record.user_id)

  if (!profile?.notif_email || !user?.user?.email) {
    return new Response('skipped', { status: 200 })
  }

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: "ALT'IN <noreply@altin-expertises.fr>",
      to: user.user.email,
      subject: record.title,
      html: `<p>Bonjour ${profile.full_name},</p>
             <p>${record.body}</p>
             <p><a href="https://app.altin-expertises.fr${record.link}">Voir mon dossier</a></p>`,
    }),
  })

  return new Response('ok', { status: 200 })
})
