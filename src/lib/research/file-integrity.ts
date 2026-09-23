import { createHash } from "node:crypto";

export async function fingerprintStream(stream: ReadableStream<Uint8Array>) {
  const hash = createHash("sha256");
  let size = 0;
  const reader = stream.getReader();
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      hash.update(value);
      size += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }
  return { sha256: hash.digest("hex"), size };
}
