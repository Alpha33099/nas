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
const DEV_FALLBACK_CRYPTO_SECRET = "simvaya-bep20-master-crypto-secret-32-chars!!";

function getMasterSecret(): Buffer {
  const secret = process.env.CRYPTO_MASTER_SECRET;
  if (!secret) {
    console.warn("[CRYPTO WARNING] CRYPTO_MASTER_SECRET not configured in environment. Using fallback secret.");
    return crypto.createHash("sha256").update(DEV_FALLBACK_CRYPTO_SECRET).digest();
  }
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

/**
 * 6. Automated Gas Relayer & Sweeper
 * Automatically funds the deposit address with exact micro-BNB gas from GAS_FUNDER_PRIVATE_KEY
 * and sweeps the full USDT balance directly to the Master Cold Wallet.
 */
export async function autoSweepWithGasFunder(
  encryptedKey: string,
  ivHex: string,
  tagHex: string,
  coldWalletAddress: string
): Promise<{ success: boolean; txHash?: string; amount?: number; error?: string }> {
  try {
    const funderKey = process.env.GAS_FUNDER_PRIVATE_KEY;
    if (!funderKey) {
      console.warn("GAS_FUNDER_PRIVATE_KEY not set in environment. Falling back to direct sweep.");
      return sweepDepositWallet(encryptedKey, ivHex, tagHex, coldWalletAddress);
    }

    const privKey = decryptPrivateKey(encryptedKey, ivHex, tagHex);
    const provider = new ethers.JsonRpcProvider("https://bsc-dataseed.binance.org");
    const depositWallet = new ethers.Wallet(privKey, provider);
    const funderWallet = new ethers.Wallet(funderKey, provider);

    // 1. Check USDT balance on deposit wallet
    const currentUsdt = await checkBscUsdtBalance(depositWallet.address);
    if (currentUsdt <= 0) {
      return { success: false, error: "Zero USDT balance on deposit address." };
    }

    // 2. Check current BNB gas balance on deposit wallet
    const depositBnb = await provider.getBalance(depositWallet.address);
    const gasPrice = ethers.parseUnits("1", "gwei");
    const requiredGasForSweep = BigInt(60000) * gasPrice; // ~0.00006 BNB max

    if (depositBnb < requiredGasForSweep) {
      const gasNeeded = requiredGasForSweep - depositBnb;
      const funderBnb = await provider.getBalance(funderWallet.address);
      if (funderBnb < gasNeeded + BigInt(21000) * gasPrice) {
        console.warn("Gas Funder wallet has insufficient BNB balance for gas drop.");
        return { success: false, error: "Gas Funder wallet out of BNB. Please fund relayer." };
      }

      console.log(`Relayer funding ${ethers.formatEther(gasNeeded)} BNB to ${depositWallet.address}...`);
      const fundTx = await funderWallet.sendTransaction({
        to: depositWallet.address,
        value: gasNeeded,
        gasPrice,
        gasLimit: 21000,
      });
      await fundTx.wait(1);
      console.log(`Gas funded successfully in tx: ${fundTx.hash}`);
    }

    // 3. Deposit wallet now has sufficient BNB. Sweep full USDT to cold wallet
    const usdtAbi = [
      "function balanceOf(address) view returns (uint256)",
      "function transfer(address to, uint256 amount) returns (bool)",
    ];
    const usdtContract = new ethers.Contract(BSC_USDT_CONTRACT, usdtAbi, depositWallet);
    const usdtUnits = await usdtContract.balanceOf(depositWallet.address);

    const tx = await usdtContract.transfer(coldWalletAddress, usdtUnits, {
      gasPrice,
      gasLimit: 60000,
    });

    const receipt = await tx.wait(1);
    console.log(`Auto-sweep confirmed on BSC: ${tx.hash}`);

    return {
      success: true,
      txHash: receipt?.hash || tx.hash,
      amount: currentUsdt,
    };
  } catch (err: any) {
    console.error("Auto-sweep error:", err);
    return {
      success: false,
      error: err?.message || "Auto-sweep failed.",
    };
  }
}

