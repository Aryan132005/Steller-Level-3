import { useState } from "react";
import { useWallet } from "./hooks/useWallet";
import WalletConnect from "./components/WalletConnect";
import BalanceDisplay from "./components/BalanceDisplay";
import SendPayment from "./components/SendPayment";
import TransactionStatus from "./components/TransactionStatus";
import { Sparkles, Terminal, ShieldAlert } from "lucide-react";

export function App() {
  const wallet = useWallet();

  const [txState, setTxState] = useState<"idle" | "sending" | "success" | "failure">("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTxStart = () => {
    setTxState("sending");
    setTxHash(null);
    setErrorMsg(null);
  };

  const handleTxSuccess = (hash: string) => {
    setTxState("success");
    setTxHash(hash);
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
                refreshBalance={wallet.refreshBalance}
                fundWithFriendbot={wallet.fundWithFriendbot}
                isTestnet={wallet.isTestnet}
              />
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
                refreshBalance={wallet.refreshBalance}
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
