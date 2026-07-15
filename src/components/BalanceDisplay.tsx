import React, { useState } from "react";
import { Coins, RefreshCw, HelpCircle, ExternalLink } from "lucide-react";

interface BalanceDisplayProps {
  balance: string;
  isUnfunded: boolean;
  isFunding: boolean;
  refreshBalance: () => void;
  fundWithFriendbot: () => void;
  isTestnet: boolean;
}

export const BalanceDisplay: React.FC<BalanceDisplayProps> = ({
  balance,
  isUnfunded,
  isFunding,
  refreshBalance,
  fundWithFriendbot,
  isTestnet,
}) => {
  const [isRotating, setIsRotating] = useState(false);

  const handleRefresh = () => {
    setIsRotating(true);
    refreshBalance();
    setTimeout(() => {
      setIsRotating(false);
    }, 1000);
  };

  const formatBalance = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return "0.00";
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 7,
    });
  };

  return (
    <div className="card glass-card">
      <div className="card-header">
        <div className="header-title-container">
          <Coins className="accent-icon" size={24} />
          <h2>XLM Balance</h2>
        </div>
        <button
          onClick={handleRefresh}
          className="btn-icon-only"
          title="Refresh Balance"
          disabled={isFunding}
        >
          <RefreshCw size={18} className={isRotating ? "spinner" : ""} />
        </button>
      </div>

      <div className="card-body text-center">
        {isUnfunded ? (
          <div className="balance-container unfunded">
            <span className="balance-amount">0.00</span>
            <span className="balance-symbol">XLM</span>
            <span className="unfunded-badge">Unfunded Account</span>
          </div>
        ) : (
          <div className="balance-container">
            <span className="balance-amount">{formatBalance(balance)}</span>
            <span className="balance-symbol">XLM</span>
          </div>
        )}

        {isUnfunded && isTestnet && (
          <div className="friendbot-funding-box mt-6">
            <div className="alert alert-info">
              <HelpCircle size={20} className="alert-icon" />
              <div className="alert-content text-left">
                <strong>New Account</strong>
                <p>This account does not exist on the Stellar testnet yet because it hasn't been funded.</p>
              </div>
            </div>

            <button
              onClick={fundWithFriendbot}
              disabled={isFunding}
              className="btn btn-secondary w-full py-2-5 mt-3"
            >
              {isFunding ? (
                <>
                  <RefreshCw size={16} className="btn-icon spinner" />
                  Funding Account...
                </>
              ) : (
                "Fund 10,000 XLM with Friendbot"
              )}
            </button>

            <a
              href="https://friendbot.stellar.org"
              target="_blank"
              rel="noreferrer"
              className="link-with-icon mt-3 justify-center"
            >
              Go to Friendbot Portal <ExternalLink size={12} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
export default BalanceDisplay;
