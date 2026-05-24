// Edge Function Supabase : envoi email via Resend
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

  // Récupérer le profil du client
  const { data: profile } = await sb
    .from('profiles')
    .select('full_name, notif_email')
    .eq('id', record.user_id)
    .single()

  // Si le client a désactivé les emails, on skip
  if (profile && !profile.notif_email) {
    return new Response('skipped: notif_email off', { status: 200 })
  }

  // Récupérer l'email depuis auth
  let email: string | null = null
  let clientName: string = profile?.full_name ?? 'Client'

  const { data: authUser } = await sb.auth.admin.getUserById(record.user_id)
  if (authUser?.user?.email) {
    email = authUser.user.email
  }

  // Fallback : email du dossier si le client n'a pas encore de compte auth
  if (!email && record.dossier_id) {
    const { data: dossier } = await sb
      .from('dossiers')
      .select('client_email, client_name')
      .eq('id', record.dossier_id)
      .single()
    if (dossier?.client_email) {
      email = dossier.client_email
      if (!clientName || clientName === 'Client') clientName = dossier.client_name ?? 'Client'
    }
  }

  if (!email) {
    return new Response('skipped: no email found', { status: 200 })
  }

  const appUrl = 'https://app.altin-expertises.fr'
  const link = record.link ? `${appUrl}${record.link}` : appUrl

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: "ALT'IN Expertises <noreply@altin-expertises.fr>",
      to: [email],
      subject: record.title,
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px;">
          <img src="${appUrl}/logo_altin.png" alt="ALT'IN" style="height: 40px; margin-bottom: 24px;" />
          <h2 style="color: #1a1a2e; margin: 0 0 12px;">${record.title}</h2>
          <p style="color: #555; line-height: 1.6;">Bonjour ${clientName},</p>
          <p style="color: #555; line-height: 1.6;">${record.body}</p>
          <a href="${link}"
            style="display:inline-block; margin-top: 20px; padding: 12px 24px;
                   background: #1a1a2e; color: white; border-radius: 6px;
                   text-decoration: none; font-weight: 600;">
            Voir mon dossier
          </a>
          <p style="color: #aaa; font-size: 12px; margin-top: 32px;">
            ALT'IN Expertises · <a href="https://altin-expertises.fr" style="color:#aaa;">altin-expertises.fr</a>
          </p>
        </div>
      `,
    }),
  })

  const body = await res.text()
  return new Response(body, { status: res.status, headers: { 'Content-Type': 'application/json' } })
})
