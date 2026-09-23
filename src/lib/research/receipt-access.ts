/** Fragment credentials are not sent to servers or included in referrers.
 * Accept old query-string receipts too, and scrub both before analytics starts.
 */
export function parseResearchReceipt(href: string) {
  const url = new URL(href);
  if (url.pathname !== "/research/download") return null;
  const fragment = new URLSearchParams(url.hash.slice(1));
  const licenseKey = (
    fragment.get("licenseKey") ?? url.searchParams.get("licenseKey")
  )?.trim();
  if (!licenseKey) return null;
  fragment.delete("licenseKey");
  url.hash = fragment.toString();
  url.searchParams.delete("licenseKey");
  return { licenseKey, cleanUrl: `${url.pathname}${url.search}${url.hash}` };
}
let receiptKey = "";
export function captureResearchReceipt() {
  if (typeof window === "undefined") return "";
  const receipt = parseResearchReceipt(window.location.href);
  if (receipt) {
    receiptKey = receipt.licenseKey;
    window.history.replaceState(window.history.state, "", receipt.cleanUrl);
  }
  return receiptKey;
}

export function consumeResearchReceipt() {
  captureResearchReceipt();
  const key = receiptKey;
  receiptKey = "";
  return key;
}
