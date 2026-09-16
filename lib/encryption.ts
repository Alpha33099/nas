import crypto from "crypto";

function getEncryptionKey(): Buffer {
  const key = process.env.ESIM_CREDENTIALS_ENCRYPTION_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ESIM_CREDENTIALS_ENCRYPTION_KEY environment variable is required.");
    }
    return crypto.createHash("sha256").update("simvaya-local-dev-key").digest();
  }
  return Buffer.from(key, "hex");
}
/**
 * Encrypts a string using AES-256-GCM.
 * Returns a combined string: iv:authTag:encryptedData (all in hex).
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();

  // Generate a random 12-byte initialization vector (IV)
  const iv = crypto.randomBytes(12);

  // Create the cipher
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  // Encrypt the text
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Get the authentication tag (ensures data hasn't been tampered with)
  const authTag = cipher.getAuthTag().toString("hex");

  // Combine iv + authTag + encrypted data into one string
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a string that was encrypted with the encrypt() function.
 * Expects the format: iv:authTag:encryptedData (all in hex).
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();

  // Split the combined string back into parts
  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted text format.");
  }

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];

  // Create the decipher
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  // Decrypt the text
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}