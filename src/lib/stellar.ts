import {
  Horizon,
  TransactionBuilder,
  Operation,
  Asset,
  Networks,
  Memo,
  Transaction,
  rpc,
  Address,
  nativeToScVal,
  scValToNative,
  Account,
} from "@stellar/stellar-sdk";

export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
export const NETWORK_PASSPHRASE = Networks.TESTNET; // "Test SDN Network ; September 2015"

export const server = new Horizon.Server(HORIZON_URL);
export const rpcServer = new rpc.Server(SOROBAN_RPC_URL);

export const CONTRACT_ID = "CA6G6PWT4CRBWSJFC5GNDFUPRMPHMKCFLOAPCC7JMB42ZY3YCMEMNLAK";
export const NATIVE_TOKEN_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

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

/**
 * Invokes the Soroban payment contract transfer function.
 * 1. Builds transaction
 * 2. Simulates transaction
 * 3. Assembles transaction with footprints
 * 4. Signs with Freighter
 * 5. Submits to Soroban RPC
 * 6. Polls for success/failure
 */
export async function invokeContractPayment(
  sender: string,
  receiver: string,
  amount: string,
  signTxFn: (xdr: string, opts?: any) => Promise<string | { signedTxXdr?: string; error?: any }>
): Promise<string> {
  // Load sender's Horizon account to get current sequence number
  const sourceAccount = await server.loadAccount(sender);

  // Convert amount (e.g. 10 XLM) to stroops (7 decimals).
  // 1 XLM = 10,000,000 stroops.
  const amountInt = BigInt(Math.round(parseFloat(amount) * 10_000_000));

  // Build the Soroban transaction
  const tx = new TransactionBuilder(sourceAccount, {
    fee: "100", // Will be overridden by simulation
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: CONTRACT_ID,
        function: "transfer",
        args: [
          Address.fromString(NATIVE_TOKEN_ID).toScVal(), // token_address
          Address.fromString(sender).toScVal(),         // from
          Address.fromString(receiver).toScVal(),       // to
          nativeToScVal(amountInt, { type: "i128" }),   // amount
        ],
      })
    )
    .setTimeout(180)
    .build();

  // Simulate transaction
  const simResult = await rpcServer.simulateTransaction(tx);
  if ((simResult as any).error) {
    throw new Error(`Simulation failed: ${JSON.stringify((simResult as any).error)}`);
  }

  // Assemble transaction
  const preparedTx = rpc.assembleTransaction(tx, simResult as any).build();

  // Get Freighter signature
  const signResult = await signTxFn(preparedTx.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  let signedXdr: string;
  if (typeof signResult === "string") {
    signedXdr = signResult;
  } else if (signResult && signResult.signedTxXdr) {
    signedXdr = signResult.signedTxXdr;
  } else if (signResult && signResult.error) {
    throw new Error(signResult.error.message || signResult.error.toString() || "Freighter rejected signing.");
  } else {
    throw new Error("No signature returned from Freighter.");
  }

  // Submit to RPC
  const response = await rpcServer.sendTransaction(new Transaction(signedXdr, NETWORK_PASSPHRASE));
  if (response.status === "ERROR") {
    throw new Error(`Failed to send transaction: ${JSON.stringify(response.errorResult)}`);
  }

  // Poll status
  let isPending = true;
  let pollResult: any;
  const startTime = Date.now();
  const timeoutMs = 60000; // 1 minute timeout

  while (isPending) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error("Transaction polling timed out.");
    }
    
    pollResult = await rpcServer.getTransaction(response.hash);

    if (pollResult.status === "NOT_FOUND") {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } else {
      isPending = false;
    }
  }

  if (pollResult.status === "SUCCESS") {
    return response.hash;
  } else {
    throw new Error(`Transaction failed with status: ${pollResult.status}. Result XDR: ${pollResult.resultXdr}`);
  }
}

/**
 * Simulates a read-only (view) call to the smart contract.
 */
async function simulateViewCall(functionName: string, args: any[] = []): Promise<any> {
  // Use a dummy account for simulation
  const dummyAccount = new Account("GA2XSJVTLCQHAKG7DNHKE33GETBVGX4JIDOEVAUQIRUUFFQ7VWY4WSWQ", "0");
  
  const tx = new TransactionBuilder(dummyAccount, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: CONTRACT_ID,
        function: functionName,
        args: args,
      })
    )
    .setTimeout(30)
    .build();

  const simResult = (await rpcServer.simulateTransaction(tx)) as any;
  
  if (simResult.error) {
    throw new Error(`Simulation failed for ${functionName}: ${JSON.stringify((simResult as any).error)}`);
  }

  if (simResult.result && simResult.result.retval) {
    return scValToNative(simResult.result.retval);
  }
  
  throw new Error(`Simulation returned no result for ${functionName}`);
}

/**
 * Fetch total number of payments processed by the contract.
 */
export async function getPaymentCount(): Promise<number> {
  try {
    const val = await simulateViewCall("get_payment_count");
    return Number(val);
  } catch (e) {
    console.error("Failed to fetch payment count:", e);
    return 0;
  }
}

/**
 * Fetch total volume transferred by the contract (in XLM).
 */
export async function getTotalVolume(): Promise<string> {
  try {
    const val = await simulateViewCall("get_total_volume");
    // Convert back from stroops to XLM
    const stroops = BigInt(val.toString());
    const xlm = Number(stroops) / 10_000_000;
    return xlm.toFixed(7);
  } catch (e) {
    console.error("Failed to fetch total volume:", e);
    return "0.0000000";
  }
}
