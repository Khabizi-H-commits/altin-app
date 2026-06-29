import type { Role } from '@/types'

// Chemin de base de l'espace pro selon le rôle.
// Les partenaires ont leur propre espace /partenaire ; les experts (et
// l'admin qui les visualise) restent sur /expert. Les pages "expert" sont
// réutilisées pour les deux via ce chemin dérivé du rôle.
export function basePathForRole(role?: Role | null): string {
  return role === 'partenaire' ? '/partenaire' : '/expert'
}
