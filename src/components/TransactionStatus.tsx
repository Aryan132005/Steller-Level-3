import React from "react";
import { CheckCircle2, XCircle, ExternalLink, RefreshCw, Copy, Check } from "lucide-react";

interface TransactionStatusProps {
  txState: "idle" | "sending" | "success" | "failure";
  txHash: string | null;
  errorMsg: string | null;
  clearStatus: () => void;
}

export const TransactionStatus: React.FC<TransactionStatusProps> = ({
  txState,
  txHash,
  errorMsg,
  clearStatus,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (txState === "idle") return null;

  const copyToClipboard = () => {
    if (txHash) {
      navigator.clipboard.writeText(txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const truncateHash = (hash: string) => {
    return `${hash.substring(0, 10)}...${hash.substring(hash.length - 10)}`;
  };

  return (
    <div className="status-modal-overlay">
      <div className="status-modal glass-card card">
        <div className="card-body text-center py-8 px-6">
          {txState === "sending" && (
            <div className="status-loading">
              <div className="status-icon-wrapper pulse-blue">
                <RefreshCw size={40} className="spinner text-primary" />
              </div>
              <h3 className="mt-6 text-xl font-bold">Submitting Transaction</h3>
              <p className="text-secondary mt-2">
                Building transaction, obtaining Freighter wallet signature, and broadcasting to the Stellar Testnet. Please keep Freighter open.
              </p>
            </div>
          )}

          {txState === "success" && (
            <div className="status-success animate-fade-in">
              <div className="status-icon-wrapper success-green">
                <CheckCircle2 size={40} className="text-success" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-success-bright">Transaction Successful!</h3>
              <p className="text-secondary mt-2">
                Your payment has been successfully validated and written to the Stellar Testnet ledger.
              </p>

              {txHash && (
                <div className="tx-hash-box mt-4 monospace">
                  <span className="label">Tx Hash:</span>
                  <span className="hash-value" title={txHash}>
                    {truncateHash(txHash)}
                  </span>
                  <button onClick={copyToClipboard} className="btn-copy-hash" title="Copy Hash">
                    {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                  </button>
                </div>
              )}

              {txHash && (
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary mt-6 w-full inline-flex justify-center items-center gap-2"
                >
                  View on Stellar.expert Explorer
                  <ExternalLink size={14} />
                </a>
              )}

              <button onClick={clearStatus} className="btn btn-secondary mt-3 w-full">
                Dismiss
              </button>
            </div>
          )}

          {txState === "failure" && (
            <div className="status-failure animate-fade-in">
              <div className="status-icon-wrapper failure-red">
                <XCircle size={40} className="text-danger" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-danger-bright">Transaction Failed</h3>
              <p className="text-secondary mt-2">
                The Stellar network or the Freighter wallet rejected the transaction request.
              </p>

              <div className="error-details-box mt-4 text-left">
                <strong>Error Details:</strong>
                <p className="monospace text-danger mt-1">{errorMsg || "Unknown error occurred."}</p>
              </div>

              <button onClick={clearStatus} className="btn btn-primary mt-6 w-full">
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default TransactionStatus;
