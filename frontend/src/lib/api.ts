import axios from 'axios'
import type { FeatureVector, Report, User } from '../types'

const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'X-ZKCredit-Request': '1' },
})

export const auth = {
  signup: (email: string, password: string) =>
    http.post<User>('/auth/signup', { email, password }).then(r => r.data),

  login: (email: string, password: string) =>
    http.post<User>('/auth/login', { email, password }).then(r => r.data),

  logout: () =>
    http.post('/auth/logout'),

  me: () =>
    http.get<User>('/auth/me').then(r => r.data),

  linkWallet: (wallet_address: string) =>
    http.patch('/auth/wallet', { wallet_address }),
}

export const credit = {
  score: (features: FeatureVector) =>
    http.post<Report>('/score', features).then(r => r.data),

  reports: () =>
    http.get<Report[]>('/reports').then(r => r.data),

  report: (id: string) =>
    http.get<Report>(`/reports/${id}`).then(r => r.data),

  markLoanApplied: (report_id: string, tx_hash: string) =>
    http.patch(`/reports/${report_id}/loan`, { tx_hash }),
}
