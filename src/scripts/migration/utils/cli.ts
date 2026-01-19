/**
 * Shared CLI utilities for migration scripts
 */

export const colors = {
  red: "\x1b[0;31m",
  green: "\x1b[0;32m",
  yellow: "\x1b[1;33m",
  blue: "\x1b[0;34m",
  reset: "\x1b[0m",
};

export function printHeader(text: string) {
  console.log(
    `\n${colors.blue}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`,
  );
  console.log(`${colors.blue}║${colors.reset} ${text}`);
  console.log(
    `${colors.blue}╚═══════════════════════════════════════════════════════════════╝${colors.reset}\n`,
  );
}

export function printStep(text: string) {
  console.log(`${colors.green}▶${colors.reset} ${text}`);
}

export function printWarning(text: string) {
  console.log(`${colors.yellow}⚠${colors.reset}  ${text}`);
}

export function printError(text: string) {
  console.log(`${colors.red}✗${colors.reset} ${text}`);
}

export function printSuccess(text: string) {
  console.log(`${colors.green}✓${colors.reset} ${text}`);
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

export function log(message: string) {
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
  console.log(`[${timestamp}] ${message}`);
}
