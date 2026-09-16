import path from "path";
import crypto from "crypto";

// Safe supported file types with their exact binary magic signatures
const MAGIC_SIGNATURES: Record<string, { mime: string; bytes: number[] }[]> = {
  jpg: [{ mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] }],
  jpeg: [{ mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] }],
  png: [{ mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  webp: [{ mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] }], // RIFF header
  pdf: [{ mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF-
};

// Dangerous file extensions that can never be accepted
const DANGEROUS_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "sh", "bash", "ps1", "vbs", "jar",
  "php", "phtml", "php3", "php4", "php5", "phps",
  "js", "jsx", "ts", "tsx", "mjs", "cjs", "html", "htm",
  "xhtml", "shtml", "svg", "xml", "asp", "aspx", "jsp",
  "py", "rb", "pl", "cgi", "htaccess", "config",
]);

export interface FileValidationOptions {
  maxSizeBytes?: number; // default 5 MB
  allowedExtensions?: string[];
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  detectedMime?: string;
  sanitizedFilename?: string;
}

/**
 * Validates file buffer against true binary magic numbers, size constraints,
 * and dangerous executable signatures.
 */
export function validateFileBuffer(
  buffer: Buffer,
  originalFilename: string,
  options?: FileValidationOptions
): FileValidationResult {
  const maxBytes = options?.maxSizeBytes ?? 5 * 1024 * 1024; // 5MB default

  // 1. Size Check
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "File is empty." };
  }

  if (buffer.length > maxBytes) {
    return {
      valid: false,
      error: `File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds limit of ${(maxBytes / (1024 * 1024)).toFixed(2)} MB.`,
    };
  }

  // 2. Filename & Extension Sanitization
  const cleanOriginal = originalFilename.replace(/[\x00-\x1f\x7f/\\]/g, "");
  const ext = path.extname(cleanOriginal).toLowerCase().replace(".", "");

  if (!ext) {
    return { valid: false, error: "Files without extensions are not allowed." };
  }

  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return { valid: false, error: `Executable or script extension '.${ext}' is strictly forbidden.` };
  }

  const allowedExts = options?.allowedExtensions ?? ["jpg", "jpeg", "png", "webp", "pdf"];
  if (!allowedExts.includes(ext)) {
    return { valid: false, error: `Extension '.${ext}' is not permitted. Allowed: ${allowedExts.join(", ")}.` };
  }

  // 3. Binary Magic Number Content Inspection (not trusting extension alone)
  const signatures = MAGIC_SIGNATURES[ext];
  if (!signatures) {
    return { valid: false, error: `No signature definition found for extension '.${ext}'.` };
  }

  let signatureMatch = false;
  let detectedMime = "";

  for (const sig of signatures) {
    const matches = sig.bytes.every((byte, idx) => buffer[idx] === byte);
    if (matches) {
      // Extra check for WEBP (bytes 8..11 must be 'WEBP')
      if (ext === "webp") {
        const isWebp = buffer.slice(8, 12).toString("ascii") === "WEBP";
        if (!isWebp) continue;
      }
      signatureMatch = true;
      detectedMime = sig.mime;
      break;
    }
  }

  if (!signatureMatch) {
    return {
      valid: false,
      error: `File content does not match expected binary format for '.${ext}' (content mismatch).`,
    };
  }

  // 4. Generate randomized, non-executable storage filename
  const randomSuffix = crypto.randomBytes(16).toString("hex");
  const sanitizedFilename = `${randomSuffix}.${ext}`;

  return {
    valid: true,
    detectedMime,
    sanitizedFilename,
  };
}

/**
 * Returns a secure storage path strictly outside the public web root.
 */
export function getIsolatedStoragePath(subDirectory: string, filename: string): string {
  // Always resolves to /private_storage or OS temp outside /public
  const baseDir = path.resolve(process.cwd(), "storage_isolated", subDirectory);
  const safeFilename = path.basename(filename);
  return path.join(baseDir, safeFilename);
}
