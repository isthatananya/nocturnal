import axios from 'axios'
import type { FeatureVector, Report, User } from '../types'
import { encryptInputs } from './crypto'

const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'X-ZKCredit-Request': '1' },
})

export const auth = {
  signup: (email: string, password: string, full_name: string, date_of_birth: string, profession: string) =>
    http.post<User>('/auth/signup', { email, password, full_name, date_of_birth, profession }).then(r => r.data),

  login: (email: string, password: string) =>
    http.post<User>('/auth/login', { email, password }).then(r => r.data),

  logout: () =>
    http.post('/auth/logout'),

  me: () =>
    http.get<User>('/auth/me').then(r => r.data),

  linkWallet: (wallet_address: string) =>
    http.patch('/auth/wallet', { wallet_address }),

  changePassword: (current_password: string, new_password: string) =>
    http.patch('/auth/password', { current_password, new_password }),
}

export const credit = {
  score: async (features: FeatureVector): Promise<Report> => {
    const encrypted_inputs = await encryptInputs(features)
    return http.post<Report>('/score', { ...features, encrypted_inputs }).then(r => r.data)
  },

  reports: () =>
    http.get<Report[]>('/reports').then(r => r.data),

  report: (id: string) =>
    http.get<Report>(`/reports/${id}`).then(r => r.data),

  markLoanApplied: (report_id: string, tx_hash: string) =>
    http.patch(`/reports/${report_id}/loan`, { tx_hash }),
}
