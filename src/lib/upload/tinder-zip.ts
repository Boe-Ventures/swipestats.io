export function findUniqueTinderDataJsonPath(paths: readonly string[]): string {
  const candidates = paths.filter((path) => {
    const basename = path.split(/[\\/]/).at(-1)?.toLowerCase();
    return basename === "data.json";
  });

  if (candidates.length === 0) {
    throw new Error("Could not find data.json in ZIP archive");
  }
  if (candidates.length > 1) {
    throw new Error("ZIP archive contains multiple data.json files");
  }
  return candidates[0]!;
}
