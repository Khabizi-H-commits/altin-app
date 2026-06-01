-- Ajout des coordonnées de l'assureur et de l'expert d'assurance sur les dossiers
-- À coller dans Supabase SQL Editor (projet wxugogsgrlxrrktcewtz)

alter table public.dossiers
  add column if not exists client_phone text,
  add column if not exists insurer_company text,
  add column if not exists insurer_contract_number text,
  add column if not exists insurer_claim_number text,
  add column if not exists insurer_phone text,
  add column if not exists insurer_email text,
  add column if not exists insurer_address text,
  add column if not exists insurance_expert_name text,
  add column if not exists insurance_expert_firm text,
  add column if not exists insurance_expert_phone text,
  add column if not exists insurance_expert_email text,
  add column if not exists insurance_expert_address text;
