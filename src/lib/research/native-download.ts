import { DOWNLOAD_ACK_COOKIE, DOWNLOAD_COOKIE_PATH } from "./download-format";

export type DownloadState =
  | { phase: "idle" | "requesting" | "initiated" }
  | { phase: "error"; message: string };

/** One native POST target per mounted page. The acknowledgement marks response
 * headers arriving; the browser owns the file transfer and reports completion.
 */
export function createNativeDownload(
  onState: (state: DownloadState) => void,
  onInitiated: (licenseKey: string) => void,
  doc: Document = document,
) {
  const frame = doc.createElement("iframe");
  frame.name = `research-download-${crypto.randomUUID()}`;
  frame.title = "Dataset download";
  frame.hidden = true;
  const form = doc.createElement("form");
  form.hidden = true;
  form.method = "POST";
  form.action = "/api/download";
  form.target = frame.name;
  const license = doc.createElement("input");
  license.type = "hidden";
  license.name = "licenseKey";
  const request = doc.createElement("input");
  request.type = "hidden";
  request.name = "requestId";
  form.append(license, request);
  doc.body.append(frame, form);
  let pending: { id: string; licenseKey: string } | null = null;
  let timer: ReturnType<typeof setInterval> | undefined;
  let disposed = false;
  const clearAck = () => {
    if (pending)
      doc.cookie = `${DOWNLOAD_ACK_COOKIE}_${pending.id}=; Max-Age=0; Path=${DOWNLOAD_COOKIE_PATH}; SameSite=Strict`;
  };
  const finish = (state: DownloadState) => {
    clearAck();
    pending = null;
    clearInterval(timer);
    timer = undefined;
    if (!disposed) onState(state);
  };
  frame.onload = () => {
    if (!pending || disposed) return;
    try {
      const text = frame.contentDocument?.body.textContent?.trim();
      if (!text) return; // Initial about:blank and attachment responses have no body.
      let message = "Unable to start the download. Please try again.";
      try {
        const body: unknown = JSON.parse(text);
        if (
          body &&
          typeof body === "object" &&
          "error" in body &&
          typeof body.error === "string"
        )
          message = body.error;
      } catch {
        /* Non-JSON server error page. */
      }
      finish({ phase: "error", message });
    } catch {
      finish({
        phase: "error",
        message: "Unable to start the download. Please try again.",
      });
    }
  };
  return {
    start(licenseKey: string) {
      if (disposed || pending) return false;
      const id = crypto.randomUUID();
      clearAck();
      pending = { id, licenseKey };
      onState({ phase: "requesting" });
      timer = setInterval(() => {
        if (!pending || disposed) return;
        const acknowledged = doc.cookie
          .split(";")
          .some((c) => c.trim() === `${DOWNLOAD_ACK_COOKIE}_${pending!.id}=1`);
        if (acknowledged) {
          const key = pending.licenseKey;
          finish({ phase: "initiated" });
          onInitiated(key);
        }
      }, 250);
      try {
        license.value = licenseKey;
        request.value = id;
        form.submit();
      } catch {
        finish({
          phase: "error",
          message: "Unable to start the download. Please try again.",
        });
      } finally {
        license.value = "";
        request.value = "";
      }
      return true;
    },
    cancel() {
      if (pending) frame.src = "about:blank";
      finish({ phase: "idle" });
    },
    dispose() {
      disposed = true;
      clearInterval(timer);
      clearAck();
      pending = null;
      frame.onload = null;
      frame.remove();
      form.remove();
    },
  };
}
