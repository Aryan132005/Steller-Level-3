import React, { useState } from "react";
import { Send, AlertCircle, Sparkles } from "lucide-react";
import { StrKey } from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";
import { buildPaymentTx, submitTransaction, NETWORK_PASSPHRASE } from "../lib/stellar";

interface SendPaymentProps {
  senderAddress: string;
  balance: string;
  isUnfunded: boolean;
  onTxStart: () => void;
  onTxSuccess: (txHash: string) => void;
  onTxFailure: (errorMsg: string) => void;
  refreshBalance: () => void;
}

export const SendPayment: React.FC<SendPaymentProps> = ({
  senderAddress,
  balance,
  isUnfunded,
  onTxStart,
  onTxSuccess,
  onTxFailure,
  refreshBalance,
}) => {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSending, setIsSending] = useState(false);

  // Form Validations
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // 1. Recipient Validation
    if (!recipient) {
      newErrors.recipient = "Recipient address is required.";
    } else {
      const trimmed = recipient.trim();
      const isValid = StrKey.isValidEd25519PublicKey(trimmed);
      if (!isValid) {
        newErrors.recipient = "Invalid Stellar address format. Must start with 'G' and be 56 characters long.";
      } else if (trimmed === senderAddress) {
        newErrors.recipient = "Cannot send payment to your own address.";
      }
    }

    // 2. Amount Validation
    const amountNum = parseFloat(amount);
    if (!amount) {
      newErrors.amount = "Amount is required.";
    } else if (isNaN(amountNum) || amountNum <= 0) {
      newErrors.amount = "Amount must be a positive number.";
    } else {
      const balanceNum = parseFloat(balance);
      const networkFee = 0.00001; // Minimum Stellar base fee is 100 stroops (0.00001 XLM)
      if (amountNum + networkFee > balanceNum) {
        newErrors.amount = `Insufficient balance. Max transfer limit (amount + fee) is ${(
          Math.max(0, balanceNum - networkFee)
        ).toFixed(7)} XLM.`;
      }
    }

    // 3. Memo Validation
    if (memo) {
      const memoBytes = new TextEncoder().encode(memo).length;
      if (memoBytes > 28) {
        newErrors.memo = `Memo text exceeds maximum allowed size (28 bytes). Current size: ${memoBytes} bytes.`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isUnfunded) {
      onTxFailure("Cannot send transaction from an unfunded account. Please fund your account using Friendbot first.");
      return;
    }

    if (!validateForm()) return;

    setIsSending(true);
    onTxStart();

    try {
      const recipientAddress = recipient.trim();
      const amountString = parseFloat(amount).toString();
      const memoString = memo.trim();

      // 1. Build payment transaction
      const transaction = await buildPaymentTx(
        senderAddress,
        recipientAddress,
        amountString,
        memoString || undefined
      );

      // 2. Get Transaction XDR
      const xdr = transaction.toXDR();

      // 3. Sign transaction via Freighter
      const { signedTxXdr, error: signingError } = await signTransaction(xdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
      });

      if (signingError) {
        throw new Error(
          typeof signingError === "string"
            ? signingError
            : (signingError as any).message || "Transaction signing rejected by user."
        );
      }

      if (!signedTxXdr) {
        throw new Error("No signed transaction XDR returned from Freighter.");
      }

      // 4. Submit signed XDR to Horizon
      const response = await submitTransaction(signedTxXdr);

      if (response && response.hash) {
        onTxSuccess(response.hash);
        // Clear fields on success
        setRecipient("");
        setAmount("");
        setMemo("");
        setErrors({});
        // Re-fetch balance
        refreshBalance();
      } else {
        throw new Error("Failed to retrieve transaction hash from network submission.");
      }
    } catch (err: any) {
      console.error("Payment flow failure:", err);
      
      let errorMsg = err.message || err.toString();
      // Make error message cleaner if it comes from Horizon
      if (err.response?.data?.extras?.result_codes) {
        const codes = err.response.data.extras.result_codes;
        errorMsg = `Transaction Failed. Codes: ${JSON.stringify(codes)}`;
      } else if (err.response?.data?.title) {
        errorMsg = `Horizon Error: ${err.response.data.title}. ${err.response.data.detail || ""}`;
      }
      
      onTxFailure(errorMsg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="card glass-card">
      <div className="card-header">
        <div className="header-title-container">
          <Send className="accent-icon" size={24} />
          <h2>Send Payment</h2>
        </div>
      </div>

      <div className="card-body">
        <form onSubmit={handleSendPayment} className="payment-form">
          <div className="form-group">
            <label htmlFor="recipient">Recipient Address</label>
            <input
              id="recipient"
              type="text"
              placeholder="e.g. GA..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              disabled={isSending}
              className={`form-control monospace ${errors.recipient ? "input-error" : ""}`}
            />
            {errors.recipient ? (
              <span className="error-message">
                <AlertCircle size={14} className="err-icon" />
                {errors.recipient}
              </span>
            ) : (
              <span className="field-hint">The Stellar public key (56 characters, starting with G)</span>
            )}
          </div>

          <div className="form-group mt-4">
            <label htmlFor="amount">Amount (XLM)</label>
            <input
              id="amount"
              type="number"
              step="any"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isSending}
              className={`form-control ${errors.amount ? "input-error" : ""}`}
            />
            {errors.amount ? (
              <span className="error-message">
                <AlertCircle size={14} className="err-icon" />
                {errors.amount}
              </span>
            ) : (
              <span className="field-hint">Amount in Lumens to send. Base network fee: 0.00001 XLM.</span>
            )}
          </div>

          <div className="form-group mt-4">
            <label htmlFor="memo">Memo (Optional)</label>
            <input
              id="memo"
              type="text"
              placeholder="Max 28 bytes"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              disabled={isSending}
              className={`form-control ${errors.memo ? "input-error" : ""}`}
            />
            {errors.memo ? (
              <span className="error-message">
                <AlertCircle size={14} className="err-icon" />
                {errors.memo}
              </span>
            ) : (
              <span className="field-hint">Optional text memo to identify the transaction (Max 28 bytes)</span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSending || isUnfunded}
            className="btn btn-primary w-full mt-6 py-3"
          >
            {isSending ? (
              <>
                <div className="spinner-small btn-icon"></div>
                Processing... Please confirm in Freighter
              </>
            ) : (
              <>
                <Sparkles size={16} className="btn-icon" />
                Send XLM Payment
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
export default SendPayment;
