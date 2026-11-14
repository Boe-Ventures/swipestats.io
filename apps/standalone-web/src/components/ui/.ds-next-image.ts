// design-sync shim (wired via .ds-tsconfig.json paths): esbuild's Node-mode
// CJS interop gives `import Image from "next/image"` the whole exports object
// ({ default, getImageProps }) instead of the component at exports.default.
// next/link is unaffected (its exports object IS the component).
import * as mod from "next/dist/shared/lib/image-external.js";

type Rec = Record<string, unknown>;
const ns = mod as unknown as Rec;
const raw = (ns.default ?? ns) as Rec;

export default (raw.default ?? raw) as unknown;
export const getImageProps = (raw.getImageProps ?? ns.getImageProps) as unknown;
