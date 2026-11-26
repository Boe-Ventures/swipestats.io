/**
 * SHA-256 hashing utility using Web Crypto API
 * Works in both browser and Node.js environments
 */
export async function createSHA256Hash(str: string): Promise<string> {
  const utf8 = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", utf8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((bytes) => bytes.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}
