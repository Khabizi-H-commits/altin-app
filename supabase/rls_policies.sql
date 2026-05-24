-- ============================================================
-- RLS ALT'IN — à exécuter dans Supabase > SQL Editor
-- ============================================================

-- ── DOSSIERS ─────────────────────────────────────────────────
ALTER TABLE dossiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expert_select_dossiers" ON dossiers FOR SELECT TO authenticated
  USING (expert_id = auth.uid());

CREATE POLICY "client_select_dossier" ON dossiers FOR SELECT TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "expert_insert_dossiers" ON dossiers FOR INSERT TO authenticated
  WITH CHECK (expert_id = auth.uid());

CREATE POLICY "expert_update_dossiers" ON dossiers FOR UPDATE TO authenticated
  USING (expert_id = auth.uid()) WITH CHECK (expert_id = auth.uid());

CREATE POLICY "expert_delete_dossiers" ON dossiers FOR DELETE TO authenticated
  USING (expert_id = auth.uid());

-- ── DOSSIER_STEPS ────────────────────────────────────────────
ALTER TABLE dossier_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expert_all_steps" ON dossier_steps FOR ALL TO authenticated
  USING (dossier_id IN (SELECT id FROM dossiers WHERE expert_id = auth.uid()))
  WITH CHECK (dossier_id IN (SELECT id FROM dossiers WHERE expert_id = auth.uid()));

CREATE POLICY "client_select_steps" ON dossier_steps FOR SELECT TO authenticated
  USING (dossier_id IN (SELECT id FROM dossiers WHERE client_id = auth.uid()));

-- ── MESSAGES ─────────────────────────────────────────────────
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expert_all_messages" ON messages FOR ALL TO authenticated
  USING (dossier_id IN (SELECT id FROM dossiers WHERE expert_id = auth.uid()))
  WITH CHECK (dossier_id IN (SELECT id FROM dossiers WHERE expert_id = auth.uid()));

CREATE POLICY "client_select_messages" ON messages FOR SELECT TO authenticated
  USING (dossier_id IN (SELECT id FROM dossiers WHERE client_id = auth.uid()));

CREATE POLICY "client_insert_messages" ON messages FOR INSERT TO authenticated
  WITH CHECK (
    dossier_id IN (SELECT id FROM dossiers WHERE client_id = auth.uid())
    AND from_id = auth.uid()
  );

-- ── DOCUMENTS ────────────────────────────────────────────────
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expert_all_documents" ON documents FOR ALL TO authenticated
  USING (dossier_id IN (SELECT id FROM dossiers WHERE expert_id = auth.uid()))
  WITH CHECK (dossier_id IN (SELECT id FROM dossiers WHERE expert_id = auth.uid()));

CREATE POLICY "client_select_documents" ON documents FOR SELECT TO authenticated
  USING (dossier_id IN (SELECT id FROM dossiers WHERE client_id = auth.uid()));

-- ── ACTIVITY ─────────────────────────────────────────────────
ALTER TABLE activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expert_all_activity" ON activity FOR ALL TO authenticated
  USING (dossier_id IN (SELECT id FROM dossiers WHERE expert_id = auth.uid()))
  WITH CHECK (dossier_id IN (SELECT id FROM dossiers WHERE expert_id = auth.uid()));

CREATE POLICY "client_select_activity" ON activity FOR SELECT TO authenticated
  USING (dossier_id IN (SELECT id FROM dossiers WHERE client_id = auth.uid()));

-- ── NOTIFICATIONS ────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_select_own_notifications" ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "expert_insert_notifications" ON notifications FOR INSERT TO authenticated
  WITH CHECK (dossier_id IN (SELECT id FROM dossiers WHERE expert_id = auth.uid()));

CREATE POLICY "user_update_own_notifications" ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── PROFILES ─────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_select_own_profile" ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "expert_select_client_profiles" ON profiles FOR SELECT TO authenticated
  USING (id IN (SELECT client_id FROM dossiers WHERE expert_id = auth.uid()));

CREATE POLICY "user_update_own_profile" ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "user_insert_own_profile" ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
