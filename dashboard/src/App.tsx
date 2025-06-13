import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { UserProvider } from './contexts/UserContext'
import { useAuth } from './hooks/useAuth'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import AgentsPage from './pages/AgentsPage'
import CallsPage from './pages/CallsPage'
import AppointmentsPage from './pages/AppointmentsPage'
import CampaignsPage from './pages/CampaignsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import DNCPage from './pages/DNCPage'
import WebhooksPage from './pages/WebhooksPage'
import BillingPage from './pages/BillingPage'
import StatusPage from './pages/StatusPage'
import SettingsPage from './pages/SettingsPage'
import Layout from './components/Layout'
import LoadingSpinner from './components/LoadingSpinner'
import ErrorBoundary from './components/ErrorBoundary'

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return <AuthPage />
  }

  return (
    <Layout>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={
            <ErrorBoundary>
              <DashboardPage />
            </ErrorBoundary>
          } />
          <Route path="/agents" element={
            <ErrorBoundary>
              <AgentsPage />
            </ErrorBoundary>
          } />
          <Route path="/calls" element={
            <ErrorBoundary>
              <CallsPage />
            </ErrorBoundary>
          } />
          <Route path="/appointments" element={
            <ErrorBoundary>
              <AppointmentsPage />
            </ErrorBoundary>
          } />
          <Route path="/campaigns" element={
            <ErrorBoundary>
              <CampaignsPage />
            </ErrorBoundary>
          } />
          <Route path="/analytics" element={
            <ErrorBoundary>
              <AnalyticsPage />
            </ErrorBoundary>
          } />
          <Route path="/dnc" element={
            <ErrorBoundary>
              <DNCPage />
            </ErrorBoundary>
          } />
          <Route path="/webhooks" element={
            <ErrorBoundary>
              <WebhooksPage />
            </ErrorBoundary>
          } />
          <Route path="/billing" element={
            <ErrorBoundary>
              <BillingPage />
            </ErrorBoundary>
          } />
          <Route path="/status" element={
            <ErrorBoundary>
              <StatusPage />
            </ErrorBoundary>
          } />
          <Route path="/settings" element={
            <ErrorBoundary>
              <SettingsPage />
            </ErrorBoundary>
          } />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ErrorBoundary>
    </Layout>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <UserProvider>
          <AppContent />
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </UserProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App