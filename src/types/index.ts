export type Role = 'expert' | 'client' | 'admin'
export type StepStatus = 'pending' | 'in_progress' | 'done'
export type DossierStatus = 'active' | 'closed' | 'pending'
export type ActivityType = 'step_validated' | 'message_sent' | 'document_uploaded' | 'dossier_opened'

export interface Profile {
  id: string
  role: Role
  full_name: string | null
  phone: string | null
  initials: string | null
  notif_email: boolean
  notif_sms: boolean
  notif_push: boolean
  created_at: string
}

export interface Dossier {
  id: string
  ref: string
  type: string
  type_icon: string | null
  client_id: string | null
  client_email: string | null
  expert_id: string
  client_name: string | null
  address: string | null
  current_step: 1 | 2 | 3 | 4
  progress: number
  status: DossierStatus
  estimate_low: number | null
  estimate_high: number | null
  opened_at: string
  closed_at: string | null
}

export interface DossierStep {
  id: string
  dossier_id: string
  step_num: 1 | 2 | 3 | 4
  status: StepStatus
  validated_at: string | null
  notes: string | null
}

export interface Message {
  id: string
  dossier_id: string
  from_id: string
  txt: string
  read_at: string | null
  created_at: string
}

export interface Document {
  id: string
  dossier_id: string
  name: string
  storage_path: string
  type: string | null
  size_bytes: number | null
  uploaded_by: string
  created_at: string
}

export interface Activity {
  id: string
  dossier_id: string
  actor_id: string
  type: ActivityType
  payload: Record<string, unknown>
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  dossier_id: string | null
  title: string | null
  body: string | null
  icon: string | null
  read_at: string | null
  link: string | null
  created_at: string
}

export const STEP_LABELS: Record<number, string> = {
  1: 'Contact',
  2: 'Visite',
  3: 'Analyse',
  4: 'Suivi',
}
