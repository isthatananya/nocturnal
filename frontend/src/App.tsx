import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from './context/AuthContext'
import { Toaster } from './components/ui/toaster'
import ErrorBoundary from './components/ErrorBoundary'
import { PageTransition } from './components/ui/motion'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Score from './pages/Score'
import ScoreResult from './pages/ScoreResult'
import LoanApply from './pages/LoanApply'
import LoanActive from './pages/LoanActive'
import Reports from './pages/Reports'
import ReportDetail from './pages/ReportDetail'
import Settings from './pages/Settings'
import Verify from './pages/Verify'
import Marketplace from './pages/Marketplace'
import BankDashboard from './pages/BankDashboard'
import Deploy from './pages/Deploy'

function Spinner() {
  return (
    <div className="min-h-screen bg-midnight flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/auth/login" replace />
  return <>{children}</>
}

function RequireBank({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/auth/login" replace />
  if (user.role !== 'bank') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function GuestOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <ErrorBoundary>
        <PageTransition>{children}</PageTransition>
      </ErrorBoundary>
    </RequireAuth>
  )
}

export default function App() {
  const location = useLocation()
  return (
    <>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<GuestOnly><PageTransition><Landing /></PageTransition></GuestOnly>} />
          <Route path="/auth/login"  element={<GuestOnly><PageTransition><Login /></PageTransition></GuestOnly>} />
          <Route path="/auth/signup" element={<GuestOnly><PageTransition><Signup /></PageTransition></GuestOnly>} />

          <Route path="/dashboard"       element={<Wrap><Dashboard /></Wrap>} />
          <Route path="/score"           element={<Wrap><Score /></Wrap>} />
          <Route path="/score/result"    element={<Wrap><ScoreResult /></Wrap>} />
          <Route path="/loan/apply"      element={<Wrap><LoanApply /></Wrap>} />
          <Route path="/loan/active"     element={<Wrap><LoanActive /></Wrap>} />
          <Route path="/reports"         element={<Wrap><Reports /></Wrap>} />
          <Route path="/reports/:id"     element={<Wrap><ReportDetail /></Wrap>} />
          <Route path="/settings"        element={<Wrap><Settings /></Wrap>} />
          <Route path="/verify"          element={<Wrap><Verify /></Wrap>} />
          <Route path="/deploy"          element={<Wrap><Deploy /></Wrap>} />
          <Route path="/marketplace"     element={<Wrap><Marketplace /></Wrap>} />
          <Route path="/bank/dashboard"  element={
            <RequireBank>
              <ErrorBoundary>
                <PageTransition><BankDashboard /></PageTransition>
              </ErrorBoundary>
            </RequireBank>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
      <Toaster />
    </>
  )
}
