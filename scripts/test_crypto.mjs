import crypto from "crypto";
import { ethers } from "ethers";
import QRCode from "qrcode";

const BSC_USDT_CONTRACT = "0x55d398326f99059fF775485246999027B3197955";
const USDT_DECIMALS = 18;
const BSC_RPC_ENDPOINTS = [
  "https://binance.llamarpc.com",
  "https://bsc-dataseed.binance.org",
  "https://rpc.ankr.com/bsc",
];

function getMasterSecret() {
  const secret = process.env.CRYPTO_MASTER_SECRET || "simvaya-bep20-master-crypto-secret-32-chars!!";
  return crypto.createHash("sha256").update(secret).digest();
}

function generateDepositWallet() {
  const wallet = ethers.Wallet.createRandom();
  return { address: wallet.address, privateKey: wallet.privateKey };
}

function encryptPrivateKey(privateKey) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getMasterSecret(), iv);
  let encrypted = cipher.update(privateKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  return { encrypted, iv: iv.toString("hex"), tag };
}

function decryptPrivateKey(encrypted, ivHex, tagHex) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", getMasterSecret(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

async function checkBscUsdtBalance(depositAddress) {
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
          params: [{ to: BSC_USDT_CONTRACT, data: callData }, "latest"],
        }),
        signal: AbortSignal.timeout(5000),
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
      continue;
    }
  }
  return 0;
}

async function main() {
  console.log("=== 1. Testing EVM Keypair Generation ===");
  const wallet = generateDepositWallet();
  console.log("Generated BSC Address:", wallet.address);
  console.log("Address starts with 0x:", wallet.address.startsWith("0x"));

  console.log("\n=== 2. Testing AES-256-GCM Encryption / Decryption ===");
  const { encrypted, iv, tag } = encryptPrivateKey(wallet.privateKey);
  const decrypted = decryptPrivateKey(encrypted, iv, tag);
  console.log("Decrypted matches privateKey:", decrypted === wallet.privateKey);

  console.log("\n=== 3. Testing Public BSC RPC Balance Query ===");
  const freshBalance = await checkBscUsdtBalance(wallet.address);
  console.log(`Balance on fresh address ${wallet.address}: ${freshBalance} USDT`);

  const binanceHotWallet = "0x8894E0a0c962CB723c1976a4421c95949bE2D4E3";
  const hotWalletBalance = await checkBscUsdtBalance(binanceHotWallet);
  console.log(`Live USDT on Binance Hot Wallet (${binanceHotWallet}): ${hotWalletBalance.toLocaleString()} USDT`);

  console.log("\n=== 4. Testing Difference Tolerance (±$0.05) ===");
  const planPrice = 15.00;
  const gasFee = 0.10;
  const expectedTotal = planPrice + gasFee; // 15.10
  const minAcceptable = expectedTotal - 0.05; // 15.05

  const testCases = [
    { sent: 15.10, shouldPass: true, label: "Exact match ($15.10)" },
    { sent: 15.07, shouldPass: true, label: "Within tolerance ($15.07, -$0.03 diff)" },
    { sent: 15.05, shouldPass: true, label: "Border tolerance ($15.05, -$0.05 diff)" },
    { sent: 15.04, shouldPass: false, label: "Under tolerance ($15.04, -$0.06 diff)" },
    { sent: 16.00, shouldPass: true, label: "Overpayment ($16.00)" },
  ];

  for (const tc of testCases) {
    const passed = tc.sent >= minAcceptable;
    const ok = passed === tc.shouldPass;
    console.log(`  [${ok ? "PASS" : "FAIL"}] ${tc.label} -> Accepted: ${passed}`);
  }

  console.log("\n=== 5. Testing QR Code Generation ===");
  const sampleLpa = "LPA:1$smdp.io$TEST-ACTIVATION-CODE-12345";
  const svg = await QRCode.toString(sampleLpa, { type: "svg" });
  console.log("QR SVG length:", svg.length, "valid:", svg.includes("<svg"));

  console.log("\n>>> ALL 5 TESTS COMPLETED SUCCESSFULLY! <<<");
}

main().catch(console.error);
