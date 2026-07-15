import {
  Horizon,
  TransactionBuilder,
  Operation,
  Asset,
  Networks,
  Memo,
  Transaction,
} from "@stellar/stellar-sdk";

export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const NETWORK_PASSPHRASE = Networks.TESTNET; // "Test SDN Network ; September 2015"

export const server = new Horizon.Server(HORIZON_URL);

/**
 * Fetch the XLM balance for the given public key.
 * Returns the balance as a string, e.g., "100.5".
 * If the account does not exist (not funded), returns "0" and sets isUnfunded to true.
 */
export async function getBalance(publicKey: string): Promise<{ balance: string; isUnfunded: boolean }> {
  try {
    const account = await server.loadAccount(publicKey);
    const nativeBalance = account.balances.find((b: any) => b.asset_type === "native");
    return {
      balance: nativeBalance ? nativeBalance.balance : "0",
      isUnfunded: false,
    };
  } catch (error: any) {
    // If the account is not found (status 404), it means it's not funded yet
    if (error.response?.status === 404) {
      return { balance: "0", isUnfunded: true };
    }
    throw error;
  }
}

/**
 * Builds a payment transaction to send XLM to a destination address.
 */
export async function buildPaymentTx(
  sender: string,
  receiver: string,
  amount: string,
  memoText?: string
): Promise<Transaction> {
  const sourceAccount = await server.loadAccount(sender);
  
  // We can fetch base fee or use a default one like "100" (or 100 stroops).
  let baseFee = "100";
  try {
    const feeStats = await server.fetchBaseFee();
    baseFee = feeStats.toString();
  } catch (e) {
    console.warn("Failed to fetch base fee, defaulting to 100 stroops", e);
  }

  const txBuilder = new TransactionBuilder(sourceAccount, {
    fee: baseFee,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination: receiver,
        asset: Asset.native(),
        amount: amount,
      })
    )
    .setTimeout(180); // 3 minutes timeout

  if (memoText && memoText.trim() !== "") {
    txBuilder.addMemo(Memo.text(memoText.trim()));
  }

  return txBuilder.build();
}

/**
 * Submits a signed transaction XDR to the Horizon server.
 */
export async function submitTransaction(signedTxXdr: string): Promise<any> {
  const transaction = new Transaction(signedTxXdr, NETWORK_PASSPHRASE);
  return await server.submitTransaction(transaction);
}
