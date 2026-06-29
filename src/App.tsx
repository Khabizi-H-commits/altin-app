import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import LoginPage from './pages/auth/LoginPage'
import AuthCallbackPage from './pages/auth/AuthCallbackPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import PendingPage from './pages/auth/PendingPage'
import AdminPartenairesPage from './pages/admin/AdminPartenairesPage'
import ClientDossierPage from './pages/client/ClientDossierPage'
import ClientDocumentsPage from './pages/client/ClientDocumentsPage'
import ClientMessagesPage from './pages/client/ClientMessagesPage'
import ClientProfilPage from './pages/client/ClientProfilPage'
import ExpertDashboardPage from './pages/expert/ExpertDashboardPage'
import ExpertDossierPage from './pages/expert/ExpertDossierPage'
import ExpertRapportPage from './pages/expert/ExpertRapportPage'
import ExpertDossiersPage from './pages/expert/ExpertDossiersPage'
import ExpertAgendaPage from './pages/expert/ExpertAgendaPage'
import ExpertFormationsPage from './pages/expert/ExpertFormationsPage'
import FormationsPage from './pages/public/FormationsPage'

export default function App() {
  return (
    <Routes>
      {/* Pages publiques */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/formations" element={<FormationsPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/attente" element={<PendingPage />} />

      {/* Espace Client — protégé */}
      <Route element={<AppShell requiredRole="client" />}>
        <Route path="/client" element={<Navigate to="/client/dossier" replace />} />
        <Route path="/client/dossier" element={<ClientDossierPage />} />
        <Route path="/client/dossier/:ref" element={<ClientDossierPage />} />
        <Route path="/client/dossier/:ref/documents" element={<ClientDocumentsPage />} />
        <Route path="/client/dossier/:ref/messages" element={<ClientMessagesPage />} />
        <Route path="/client/profil" element={<ClientProfilPage />} />
      </Route>

      {/* Espace Expert — protégé */}
      <Route element={<AppShell requiredRole="expert" />}>
        <Route path="/expert" element={<ExpertDashboardPage />} />
        <Route path="/expert/dossiers" element={<ExpertDossiersPage />} />
        <Route path="/expert/dossier/:ref" element={<ExpertDossierPage />} />
        <Route path="/expert/dossier/:ref/rapport" element={<ExpertRapportPage />} />
        <Route path="/expert/agenda" element={<ExpertAgendaPage />} />
        <Route path="/expert/formations" element={<ExpertFormationsPage />} />
      </Route>

      {/* Espace Partenaire — protégé (réutilise les pages de gestion de dossiers) */}
      <Route element={<AppShell requiredRole="partenaire" />}>
        <Route path="/partenaire" element={<ExpertDashboardPage />} />
        <Route path="/partenaire/dossiers" element={<ExpertDossiersPage />} />
        <Route path="/partenaire/dossier/:ref" element={<ExpertDossierPage />} />
        <Route path="/partenaire/dossier/:ref/rapport" element={<ExpertRapportPage />} />
      </Route>

      {/* Admin — gestion des partenaires (validation des inscriptions) */}
      <Route element={<AppShell requiredRole="admin" />}>
        <Route path="/admin/partenaires" element={<AdminPartenairesPage />} />
      </Route>

      {/* Défaut */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
