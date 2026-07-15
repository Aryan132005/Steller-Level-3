import { useState, useEffect } from "react";
import { useWallet } from "./hooks/useWallet";
import WalletConnect from "./components/WalletConnect";
import BalanceDisplay from "./components/BalanceDisplay";
import SendPayment from "./components/SendPayment";
import TransactionStatus from "./components/TransactionStatus";
import { Sparkles, Terminal, ShieldAlert } from "lucide-react";
import { getPaymentCount, getTotalVolume, CONTRACT_ID } from "./lib/stellar";

export function App() {
  const wallet = useWallet();

  const [txState, setTxState] = useState<"idle" | "sending" | "success" | "failure">("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [contractCount, setContractCount] = useState<number>(0);
  const [contractVolume, setContractVolume] = useState<string>("0.0000000");

  const fetchContractStats = async () => {
    try {
      const count = await getPaymentCount();
      const volume = await getTotalVolume();
      setContractCount(count);
      setContractVolume(volume);
    } catch (e) {
      console.error("Failed to fetch contract stats:", e);
    }
  };

  // Fetch stats on load and when wallet changes
  useEffect(() => {
    fetchContractStats();
    // Poll stats every 10 seconds
    const interval = setInterval(fetchContractStats, 10000);
    return () => clearInterval(interval);
  }, [wallet.address]);

  const handleTxStart = () => {
    setTxState("sending");
    setTxHash(null);
    setErrorMsg(null);
  };

  const handleTxSuccess = (hash: string) => {
    setTxState("success");
    setTxHash(hash);
    fetchContractStats(); // Refresh stats on success
  };

  const handleTxFailure = (msg: string) => {
    setTxState("failure");
    setErrorMsg(msg);
  };

  const handleClearStatus = () => {
    setTxState("idle");
    setTxHash(null);
    setErrorMsg(null);
  };

  const handleRefreshAll = async () => {
    wallet.refreshBalance();
    await fetchContractStats();
  };

  return (
    <div className="app-container">
      {/* Dynamic Background Glows */}
      <div className="bg-glow bg-glow-1"></div>
      <div className="bg-glow bg-glow-2"></div>

      {/* Header */}
      <header className="app-header glass-card">
        <div className="header-logo">
          <Sparkles className="logo-icon animation-pulse" size={24} />
          <h1>Simple Payment dApp</h1>
        </div>
        {wallet.address && (
          <div className="header-status">
            <span className="status-indicator-green"></span>
            <span className="status-text monospace">
              {wallet.address.substring(0, 4)}...{wallet.address.substring(wallet.address.length - 4)}
            </span>
          </div>
        )}
      </header>

      {/* Main Grid Content */}
      <main className="app-main">
        <div className="dashboard-grid">
          {/* Left Column: Wallet connection and Balance */}
          <div className="dashboard-column flex flex-col gap-6">
            <WalletConnect
              address={wallet.address}
              isConnecting={wallet.isConnecting}
              isTestnet={wallet.isTestnet}
              isFreighterInstalled={wallet.isFreighterInstalled}
              error={wallet.error}
              connect={wallet.connect}
              disconnect={wallet.disconnect}
              checkNetwork={wallet.checkNetwork}
            />

            {wallet.address && (
              <BalanceDisplay
                balance={wallet.balance}
                isUnfunded={wallet.isUnfunded}
                isFunding={wallet.isFunding}
                refreshBalance={handleRefreshAll}
                fundWithFriendbot={wallet.fundWithFriendbot}
                isTestnet={wallet.isTestnet}
              />
            )}

            {wallet.address && (
              <div className="card glass-card">
                <div className="card-header">
                  <div className="header-title-container">
                    <Terminal className="accent-icon text-primary" size={20} />
                    <h2>Contract Ledger Stats</h2>
                  </div>
                </div>
                <div className="card-body">
                  <div className="stats-container flex flex-col gap-4">
                    <div className="stat-row flex justify-between items-center py-2 border-b border-muted">
                      <span className="text-secondary text-sm">Contract ID:</span>
                      <span className="monospace text-xs text-right cursor-pointer hover-underline text-primary" 
                            onClick={() => window.open(`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`, "_blank")}
                            title="Click to view on Explorer">
                        {CONTRACT_ID.substring(0, 6)}...{CONTRACT_ID.substring(CONTRACT_ID.length - 6)}
                      </span>
                    </div>
                    <div className="stat-row flex justify-between items-center py-2 border-b border-muted">
                      <span className="text-secondary text-sm">Total Payments:</span>
                      <span className="font-bold text-lg">{contractCount}</span>
                    </div>
                    <div className="stat-row flex justify-between items-center py-2">
                      <span className="text-secondary text-sm">Total Volume:</span>
                      <span className="font-bold text-lg text-accent">{contractVolume} XLM</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Send Payment form */}
          <div className="dashboard-column">
            {wallet.address ? (
              <SendPayment
                senderAddress={wallet.address}
                balance={wallet.balance}
                isUnfunded={wallet.isUnfunded}
                onTxStart={handleTxStart}
                onTxSuccess={handleTxSuccess}
                onTxFailure={handleTxFailure}
                refreshBalance={handleRefreshAll}
              />
            ) : (
              <div className="card glass-card info-prompt-card text-center py-12 px-6">
                <div className="prompt-icon-container mb-6">
                  <ShieldAlert size={48} className="prompt-icon text-muted" />
                </div>
                <h3>Wallet Disconnected</h3>
                <p className="text-secondary mt-2 max-w-md mx-auto">
                  Please connect your Freighter browser wallet on the left to unlock the payment functionality and interact with the Stellar testnet ledger.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Overlay Transaction Status Modal */}
      <TransactionStatus
        txState={txState}
        txHash={txHash}
        errorMsg={errorMsg}
        clearStatus={handleClearStatus}
      />

      {/* Footer */}
      <footer className="app-footer text-center mt-12 py-6">
        <div className="footer-content">
          <Terminal size={14} className="footer-icon" />
          <span>Stellar Testnet Horizon Client</span>
          <span className="dot-divider">•</span>
          <a
            href="https://stellar.expert/explorer/testnet"
            target="_blank"
            rel="noreferrer"
            className="hover-underline text-secondary"
          >
            Stellar.expert Testnet Explorer
          </a>
        </div>
        <p className="footer-copyright mt-2 text-muted">
          Built using React, TypeScript, Vite, Freighter API, and Stellar SDK.
        </p>
      </footer>
    </div>
  );
}

export default App;
