import crypto from "crypto";
import { ethers } from "ethers";

// Official USDT contract address on BNB Smart Chain (BEP-20)
export const BSC_USDT_CONTRACT = "0x55d398326f99059fF775485246999027B3197955";
export const USDT_DECIMALS = 18;

// Resilient public BSC RPC endpoints (Zero third-party API key required)
const BSC_RPC_ENDPOINTS = [
  "https://binance.llamarpc.com",
  "https://bsc-dataseed.binance.org",
  "https://rpc.ankr.com/bsc",
  "https://1rpc.io/bnb",
];

// Master encryption key for deposit wallet private keys
function getMasterSecret(): Buffer {
  const secret = process.env.CRYPTO_MASTER_SECRET || "simvaya-bep20-master-crypto-secret-32-chars!!";
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * 1. Generates a fresh unique EVM deposit keypair for an incoming order
 */
export function generateDepositWallet() {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}

/**
 * 2. Encrypts a private key using AES-256-GCM before database storage
 */
export function encryptPrivateKey(privateKey: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getMasterSecret(), iv);
  
  let encrypted = cipher.update(privateKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");

  return {
    encrypted,
    iv: iv.toString("hex"),
    tag,
  };
}

/**
 * 3. Decrypts a stored private key
 */
export function decryptPrivateKey(encrypted: string, ivHex: string, tagHex: string): string {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getMasterSecret(),
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * 4. Resilient on-chain BEP-20 USDT balance query via public BSC JSON-RPC
 * Uses eth_call to query balanceOf(address) directly without loading third-party providers.
 */
export async function checkBscUsdtBalance(depositAddress: string): Promise<number> {
  // Method ID for balanceOf(address) is 0x70a08231
  const cleanAddress = depositAddress.toLowerCase().replace(/^0x/, "");
  const paddedAddress = cleanAddress.padStart(64, "0");
  const callData = `0x70a08231${paddedAddress}`;

  for (const rpcUrl of BSC_RPC_ENDPOINTS) {
    try {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_call",
          params: [
            {
              to: BSC_USDT_CONTRACT,
              data: callData,
            },
            "latest",
          ],
        }),
        signal: AbortSignal.timeout(5000), // 5s timeout per RPC
      });

      if (!response.ok) continue;

      const result = await response.json();
      if (result && result.result && typeof result.result === "string") {
        const hexBalance = result.result;
        if (hexBalance === "0x" || hexBalance === "0x0") return 0;

        const bigIntVal = BigInt(hexBalance);
        const formatted = ethers.formatUnits(bigIntVal, USDT_DECIMALS);
        return parseFloat(formatted);
      }
    } catch {
      // Try next RPC endpoint
      continue;
    }
  }

  // If all RPC endpoints timed out or failed, return 0 for safe retry next interval
  return 0;
}

/**
 * 5. Ultra-low gas sweeper (1 Gwei BSC minimum)
 * Sweeps USDT from the deposit wallet directly to the master cold wallet.
 */
export async function sweepDepositWallet(
  encryptedKey: string,
  ivHex: string,
  tagHex: string,
  coldWalletAddress: string
): Promise<{ success: boolean; txHash?: string; amount?: number; error?: string }> {
  try {
    const privKey = decryptPrivateKey(encryptedKey, ivHex, tagHex);
    const provider = new ethers.JsonRpcProvider(BSC_RPC_ENDPOINTS[0]);
    const wallet = new ethers.Wallet(privKey, provider);

    // Check USDT balance
    const currentBalance = await checkBscUsdtBalance(wallet.address);
    if (currentBalance <= 0) {
      return { success: false, error: "Zero USDT balance on deposit address." };
    }

    // ABI for transfer(address,uint256)
    const usdtAbi = ["function transfer(address to, uint256 amount) returns (bool)"];
    const usdtContract = new ethers.Contract(BSC_USDT_CONTRACT, usdtAbi, wallet);

    const amountUnits = ethers.parseUnits(currentBalance.toFixed(6), USDT_DECIMALS);

    // Configure 1-Gwei gas price to minimize fee as requested
    const gasPrice = ethers.parseUnits("1", "gwei");

    const tx = await usdtContract.transfer(coldWalletAddress, amountUnits, {
      gasPrice,
    });

    const receipt = await tx.wait(1);
    return {
      success: true,
      txHash: receipt?.hash || tx.hash,
      amount: currentBalance,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to sweep funds.",
    };
  }
}
