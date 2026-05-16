import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { Toaster } from './components/ui/toaster'

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

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-midnight flex items-center justify-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!user) return <Navigate to="/auth/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth/login" element={<Login />} />
      <Route path="/auth/signup" element={<Signup />} />

      <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/score" element={<RequireAuth><Score /></RequireAuth>} />
      <Route path="/score/result" element={<RequireAuth><ScoreResult /></RequireAuth>} />
      <Route path="/loan/apply" element={<RequireAuth><LoanApply /></RequireAuth>} />
      <Route path="/loan/active" element={<RequireAuth><LoanActive /></RequireAuth>} />
      <Route path="/reports" element={<RequireAuth><Reports /></RequireAuth>} />
      <Route path="/reports/:id" element={<RequireAuth><ReportDetail /></RequireAuth>} />
      <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <Toaster />
    </>
  )
}
