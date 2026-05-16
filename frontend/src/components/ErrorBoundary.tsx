import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  reset = () => this.setState({ hasError: false, error: null })

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center px-4">
        <div className="glass rounded-3xl p-10 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <span className="text-2xl">⚠</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-100">Something went wrong</h2>
          <p className="text-sm text-slate-400 font-mono break-words">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <button onClick={this.reset} className="btn-primary px-6">Try again</button>
            <a href="/dashboard" className="btn-ghost px-6">Dashboard</a>
          </div>
        </div>
      </div>
    )
  }
}
