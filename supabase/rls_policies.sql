-- ============================================================
-- ALT'IN — Mise à jour sécurité + triggers 6 étapes
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

-- ── 1. POLITIQUES RLS MANQUANTES ────────────────────────────

-- Expert peut modifier/supprimer les étapes de ses dossiers
CREATE POLICY "expert_update_steps" ON dossier_steps FOR UPDATE TO authenticated
  USING (dossier_id IN (SELECT id FROM dossiers WHERE expert_id = auth.uid()))
  WITH CHECK (dossier_id IN (SELECT id FROM dossiers WHERE expert_id = auth.uid()));

-- Expert peut supprimer ses documents
CREATE POLICY "expert_delete_documents" ON documents FOR DELETE TO authenticated
  USING (dossier_id IN (SELECT id FROM dossiers WHERE expert_id = auth.uid()));

-- Expert peut supprimer ses dossiers
CREATE POLICY "expert_delete_dossiers" ON dossiers FOR DELETE TO authenticated
  USING (expert_id = auth.uid());

-- Expert peut voir les profils de ses clients (pour afficher noms dans messages/activité)
CREATE POLICY "expert_see_client_profiles" ON profiles FOR SELECT TO authenticated
  USING (id IN (SELECT client_id FROM dossiers WHERE expert_id = auth.uid()));

-- Expert peut insérer des notifications pour ses clients
CREATE POLICY "expert_insert_notifications" ON notifications FOR INSERT TO authenticated
  WITH CHECK (dossier_id IN (SELECT id FROM dossiers WHERE expert_id = auth.uid()));

-- ── 2. TRIGGER : CRÉATION DES 6 ÉTAPES à l'ouverture ────────

CREATE OR REPLACE FUNCTION public.create_dossier_steps() RETURNS trigger AS $$
BEGIN
  INSERT INTO dossier_steps (dossier_id, step_num, status) VALUES
    (NEW.id, 1, 'in_progress'),
    (NEW.id, 2, 'pending'),
    (NEW.id, 3, 'pending'),
    (NEW.id, 4, 'pending'),
    (NEW.id, 5, 'pending'),
    (NEW.id, 6, 'pending');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 3. TRIGGER : VALIDATION ÉTAPE → progression + notif ─────

CREATE OR REPLACE FUNCTION public.on_step_validated() RETURNS trigger AS $$
DECLARE
  v_client uuid;
  v_ref    text;
  step_messages text[] := ARRAY[
    'Votre expert a pris en charge votre dossier.',
    'La visite d''expertise sur votre bien a été effectuée.',
    'L''analyse de votre sinistre est terminée.',
    'Le suivi de votre dossier est finalisé.',
    'Votre rapport d''expertise est prêt.',
    'Votre dossier est maintenant clôturé. Merci de votre confiance.'
  ];
  step_labels text[] := ARRAY['Contact','Visite','Analyse','Suivi','Rapport','Terminé'];
BEGIN
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    SELECT client_id, ref INTO v_client, v_ref
      FROM dossiers WHERE id = NEW.dossier_id;

    -- Mettre à jour progression du dossier
    UPDATE dossiers
      SET current_step = LEAST(NEW.step_num + 1, 6),
          progress     = NEW.step_num / 6.0
      WHERE id = NEW.dossier_id AND status = 'active';

    -- Avancer l'étape suivante en in_progress
    UPDATE dossier_steps
      SET status = 'in_progress'
      WHERE dossier_id = NEW.dossier_id
        AND step_num = NEW.step_num + 1
        AND step_num <= 6;

    -- Journaliser l'activité
    INSERT INTO activity (dossier_id, actor_id, type, payload)
      VALUES (NEW.dossier_id, auth.uid(), 'step_validated',
        jsonb_build_object('step', NEW.step_num));

    -- Notifier le client (si client enregistré)
    IF v_client IS NOT NULL THEN
      INSERT INTO notifications (user_id, dossier_id, title, body, icon, link)
        VALUES (
          v_client,
          NEW.dossier_id,
          'Dossier — étape "' || step_labels[NEW.step_num] || '" validée',
          step_messages[NEW.step_num],
          '✅',
          '/client/dossier/' || v_ref
        );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
