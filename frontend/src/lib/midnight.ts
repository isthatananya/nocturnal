// Midnight.js integration point.
//
// Stubbed for development — real implementation requires:
//   1. Compact contract compiled (`./contract/compile.sh`)
//   2. Contract deployed to preprod + VITE_CONTRACT_ADDRESS set
//   3. Lace wallet installed in the user's browser
//
// To wire up: install @midnight-ntwrk/* packages and replace the stubs below
// with the provider setup from ARCHITECTURE.md §9.

export function isWalletAvailable(): boolean {
  return typeof window !== 'undefined' && !!(window as any).midnight?.mnLace
}

export async function connectWallet(): Promise<string | null> {
  if (!isWalletAvailable()) return null
  try {
    const api = await (window as any).midnight.mnLace.enable()
    return await api.getChangeAddress()
  } catch {
    return null
  }
}

export interface LoanParams {
  walletAddress: string
  compiledContract: unknown
  creditTier: number
  requestedAmount: bigint
  interestRateBps: number
  termMonths: number
}

export async function applyForLoan(_params: LoanParams): Promise<string> {
  // Real flow: buildProviders() → findDeployedContract() → callTx.applyForLoan()
  // LoanApply.tsx catches this and falls back to demo mode
  throw new Error('CONTRACT_NOT_DEPLOYED')
}

export async function repayLoan(
  _walletAddress: string,
  _compiledContract: unknown,
  _amount: bigint,
): Promise<string> {
  throw new Error('CONTRACT_NOT_DEPLOYED')
}
