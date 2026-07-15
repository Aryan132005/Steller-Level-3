import React from "react";
import { Wallet, LogOut, AlertTriangle, RefreshCw, Download } from "lucide-react";

interface WalletConnectProps {
  address: string | null;
  isConnecting: boolean;
  isTestnet: boolean;
  isFreighterInstalled: boolean | null;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  checkNetwork: () => void;
}

export const WalletConnect: React.FC<WalletConnectProps> = ({
  address,
  isConnecting,
  isTestnet,
  isFreighterInstalled,
  error,
  connect,
  disconnect,
  checkNetwork,
}) => {
  const truncateAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="card glass-card">
      <div className="card-header">
        <div className="header-title-container">
          <Wallet className="accent-icon" size={24} />
          <h2>Freighter Wallet</h2>
        </div>
        {address && (
          <span className={`status-badge ${isTestnet ? "badge-success" : "badge-warning"}`}>
            <span className="pulse-dot"></span>
            {isTestnet ? "Stellar Testnet" : "Wrong Network"}
          </span>
        )}
      </div>

      <div className="card-body">
        {isFreighterInstalled === false && (
          <div className="alert alert-danger">
            <Download size={20} className="alert-icon" />
            <div className="alert-content">
              <strong>Freighter Not Detected</strong>
              <p>Please install the Freighter browser extension to interact with this dApp.</p>
              <a
                href="https://www.freighter.app/"
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm mt-2"
              >
                Install Freighter
              </a>
            </div>
          </div>
        )}

        {address ? (
          <div className="wallet-connected-info">
            <div className="info-row">
              <span className="label">Public Address:</span>
              <span className="value monospace" title={address}>
                {truncateAddress(address)}
              </span>
            </div>

            {!isTestnet && (
              <div className="alert alert-warning mt-4">
                <AlertTriangle size={20} className="alert-icon" />
                <div className="alert-content">
                  <strong>Network Mismatch</strong>
                  <p>Your Freighter wallet is not on Stellar Testnet. Please switch it in Freighter settings.</p>
                  <button onClick={checkNetwork} className="btn btn-secondary btn-sm mt-2">
                    Re-check Network
                  </button>
                </div>
              </div>
            )}

            {error && isTestnet && (
              <div className="alert alert-danger mt-4">
                <AlertTriangle size={20} className="alert-icon" />
                <p>{error}</p>
              </div>
            )}

            <button onClick={disconnect} className="btn btn-danger w-full mt-6">
              <LogOut size={16} className="btn-icon" />
              Disconnect Wallet
            </button>
          </div>
        ) : (
          <div className="wallet-disconnected-info">
            <p className="text-secondary text-center mb-6">
              Connect your Freighter wallet to check your XLM balance and send payments on the Stellar testnet network.
            </p>
            {error && (
              <div className="alert alert-danger mb-4">
                <AlertTriangle size={20} className="alert-icon" />
                <p>{error}</p>
              </div>
            )}
            <button
              onClick={connect}
              disabled={isConnecting}
              className="btn btn-primary w-full py-3"
            >
              {isConnecting ? (
                <>
                  <RefreshCw size={18} className="btn-icon spinner" />
                  Connecting Wallet...
                </>
              ) : (
                <>
                  <Wallet size={18} className="btn-icon" />
                  Connect Freighter Wallet
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
export default WalletConnect;
