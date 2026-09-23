import { expect, test } from "bun:test";
import { createNativeDownload, type DownloadState } from "./native-download";
import { DOWNLOAD_ACK_COOKIE } from "./download-format";

function fixtureDocument() {
  const nodes: ElementStub[] = [];
  const posts: Record<string, string>[] = [];
  const cookies = new Map<string, string>();
  class ElementStub {
    name = "";
    value = "";
    src = "";
    children: ElementStub[] = [];
    onload: (() => void) | null = null;
    contentDocument = { body: { textContent: "" } };
    constructor(readonly tag: string) {}
    append(...elements: ElementStub[]) {
      this.children.push(...elements);
    }
    submit() {
      posts.push(
        Object.fromEntries(this.children.map((c) => [c.name, c.value])),
      );
    }
    remove() {
      const index = nodes.indexOf(this);
      if (index !== -1) nodes.splice(index, 1);
    }
  }
  const doc = {
    createElement: (tag: string) => new ElementStub(tag),
    body: { append: (...elements: ElementStub[]) => nodes.push(...elements) },
    get cookie() {
      return [...cookies].map(([key, value]) => `${key}=${value}`).join("; ");
    },
    set cookie(text: string) {
      const [pair] = text.split(";");
      const [key, value] = pair!.split("=");
      if (text.includes("Max-Age=0")) cookies.delete(key!);
      else cookies.set(key!, value!);
    },
  };
  return {
    doc: doc as unknown as Document,
    nodes,
    posts,
    acknowledge: () => {
      doc.cookie = `${DOWNLOAD_ACK_COOKIE}_${posts.at(-1)!.requestId}=1`;
    },
  };
}

test("native downloads reuse one target, serialize slow initiation, recover errors, and dispose", async () => {
  const f = fixtureDocument();
  const states: DownloadState[] = [];
  const initiated: string[] = [];
  const controller = createNativeDownload(
    (state) => states.push(state),
    (key) => initiated.push(key),
    f.doc,
  );
  expect(controller.start("first")).toBe(true);
  expect(controller.start("overlap")).toBe(false);
  await Bun.sleep(600);
  expect(states.at(-1)?.phase).toBe("requesting");
  expect(f.posts).toHaveLength(1);
  f.acknowledge();
  await Bun.sleep(300);
  expect(states.at(-1)?.phase).toBe("initiated");
  controller.start("second");
  f.acknowledge();
  await Bun.sleep(300);
  expect(initiated).toEqual(["first", "second"]);
  expect(f.nodes.filter((n) => n.tag === "iframe")).toHaveLength(1);
  controller.start("error");
  const frame = f.nodes.find((n) => n.tag === "iframe")!;
  frame.contentDocument.body.textContent = JSON.stringify({
    error: "Please retry",
  });
  frame.onload?.();
  expect(states.at(-1)).toEqual({ phase: "error", message: "Please retry" });
  controller.start("retry");
  f.acknowledge();
  await Bun.sleep(300);
  expect(initiated.at(-1)).toBe("retry");
  controller.start("cancel");
  controller.cancel();
  expect(frame.src).toBe("about:blank");
  controller.start("unmount");
  const before = states.length;
  controller.dispose();
  f.acknowledge();
  await Bun.sleep(300);
  expect(states).toHaveLength(before);
  expect(frame.onload).toBeNull();
  expect(f.nodes).toHaveLength(0);
  expect(controller.start("after-unmount")).toBe(false);
});
