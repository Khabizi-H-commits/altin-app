import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { ClientNav } from '@/components/layout/ClientNav'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import type { Message } from '@/types'

type MsgWithProfile = Message & { profiles: { full_name: string; initials: string; role: string } }

export default function ClientMessagesPage() {
  const { ref } = useParams<{ ref: string }>()
  const { profile } = useAuthStore()
  const [dossierId, setDossierId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MsgWithProfile[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })

  useEffect(() => {
    const init = async () => {
      if (!ref) return
      const { data: d } = await supabase.from('dossiers').select('id').eq('ref', ref).single()
      if (!d) return
      setDossierId(d.id)
      const { data: m } = await supabase
        .from('messages')
        .select('*, profiles!from_id(full_name, initials, role)')
        .eq('dossier_id', d.id)
        .order('created_at')
      setMessages((m ?? []) as MsgWithProfile[])

      // Realtime (insert, update, delete)
      const channel = supabase.channel(`client-msgs-${d.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `dossier_id=eq.${d.id}` },
          async () => {
            const { data: fresh } = await supabase
              .from('messages')
              .select('*, profiles!from_id(full_name, initials, role)')
              .eq('dossier_id', d.id)
              .order('created_at')
            setMessages((fresh ?? []) as MsgWithProfile[])
          }
        )
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    }
    init()
  }, [ref])

  useEffect(() => { scrollToBottom() }, [messages])

  useEffect(() => {
    if (!profile || !dossierId) return
    supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', profile.id)
      .eq('dossier_id', dossierId)
      .is('read_at', null)
      .then(() => {})
  }, [profile?.id, dossierId])

  const handleSend = async () => {
    if (!newMsg.trim() || !dossierId || !profile) return
    setSending(true)
    await supabase.from('messages').insert({
      dossier_id: dossierId,
      from_id: profile.id,
      txt: newMsg.trim(),
    })
    setNewMsg('')
    setSending(false)
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="min-h-screen bg-paper-2 flex flex-col">
      <ClientNav />

      {/* Messages */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-36 space-y-3 overflow-y-auto">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-3xl mb-3">💬</p>
            <p className="font-semibold text-ink">Démarrez la conversation</p>
            <p className="text-sm text-muted mt-1">Posez vos questions à votre expert.</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.from_id === profile?.id
          const showDate = i === 0 ||
            formatDate(messages[i - 1].created_at) !== formatDate(msg.created_at)

          return (
            <div key={msg.id}>
              {showDate && (
                <p className="text-center text-xs text-muted my-3">{formatDate(msg.created_at)}</p>
              )}
              <div className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                {!isMe && (
                  <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0 mt-auto">
                    {msg.profiles?.initials ?? 'HK'}
                  </div>
                )}
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMe ? 'bg-primary text-white rounded-br-sm' : 'bg-paper text-ink rounded-bl-sm shadow-sm'
                  }`}>
                    {msg.txt}
                  </div>
                  <p className="text-xs text-muted px-1">
                    {formatTime(msg.created_at)}
                    {msg.edited_at && <span className="italic ml-1">· modifié</span>}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input fixe en bas */}
      <div className="fixed bottom-16 left-0 right-0 bg-paper border-t border-paper-2 px-4 py-3 max-w-lg mx-auto w-full">
        <div className="flex gap-2">
          <input
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Votre message…"
            className="flex-1 px-4 py-2.5 rounded-full border border-paper-2 bg-paper-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <button
            onClick={handleSend}
            disabled={sending || !newMsg.trim()}
            className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center disabled:opacity-50 hover:opacity-90 transition-opacity shrink-0"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="text-sm">→</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
