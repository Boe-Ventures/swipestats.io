#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as fs from "fs";
import * as path from "path";

// ============================================================================
// Type Definitions (ported from tinder-data-json-analysis.ts)
// ============================================================================

interface AnalysisOptions {
  maxArrayItems: number;
  maxStringLength: number;
  scanArrayForOptionalKeys: boolean;
  maxSchemaKeys: number;
}

interface TypeInfo {
  type: string;
  optional?: boolean;
  arrayLength?: number;
  unionTypes?: Set<string>;
  presence?: number;
  sampleValues?: unknown[];
}

interface DiscoveredFiles {
  core: {
    user?: string;
    matches?: string;
    prompts?: string;
  };
  additional: string[];
  ignored: string[];
  mediaFolder?: {
    path: string;
    filesByType: Record<string, number>;
    totalFiles: number;
  };
}

// ============================================================================
// Analysis Functions (ported from tinder-data-json-analysis.ts)
// ============================================================================

/**
 * Analyzes the structure of a value and returns type information
 */
function analyzeValue(
  value: unknown,
  options: AnalysisOptions,
  depth = 0,
): { type: string; details?: string } {
  if (value === null) {
    return { type: "null" };
  }
  if (value === undefined) {
    return { type: "undefined" };
  }

  const type = typeof value;

  if (type === "string") {
    return { type: "string" };
  }
  if (type === "number") {
    return { type: "number" };
  }
  if (type === "boolean") {
    return { type: "boolean" };
  }

  if (Array.isArray(value)) {
    return { type: "array", details: `${value.length} items` };
  }

  if (type === "object") {
    return { type: "object" };
  }

  return { type };
}

/**
 * Scans all items in an array to discover all possible keys and their presence
 */
function scanArrayForSchema(arr: unknown[]): Map<string, TypeInfo> {
  const keyInfo = new Map<string, TypeInfo>();

  for (const item of arr) {
    if (typeof item === "object" && item !== null && !Array.isArray(item)) {
      const obj = item as Record<string, unknown>;
      for (const [key, value] of Object.entries(obj)) {
        if (!keyInfo.has(key)) {
          keyInfo.set(key, {
            type: "unknown",
            presence: 0,
            unionTypes: new Set<string>(),
            sampleValues: [],
          });
        }

        const info = keyInfo.get(key)!;
        info.presence = (info.presence || 0) + 1;

        const valueAnalysis = analyzeValue(value, {
          maxArrayItems: 3,
          maxStringLength: 50,
          scanArrayForOptionalKeys: false,
          maxSchemaKeys: 20,
        });
        info.unionTypes!.add(valueAnalysis.type);

        if (info.sampleValues!.length < 2) {
          info.sampleValues!.push(value);
        }
      }
    }
  }

  for (const info of keyInfo.values()) {
    info.presence = Math.round((info.presence! / arr.length) * 100);
    info.optional = info.presence < 100;
  }

  return keyInfo;
}

/**
 * Detects if an object appears to be a map-like structure
 */
function detectMapPattern(
  keys: string[],
  maxSchemaKeys: number,
): {
  isMap: boolean;
  pattern?: string;
  sampleKeys: string[];
} {
  if (keys.length < 5) {
    return { isMap: false, sampleKeys: keys.slice(0, 3) };
  }

  const datePattern = /^\d{4}-\d{2}(-\d{2})?$/;
  const dateMatches = keys.filter((k) => datePattern.test(k)).length;
  if (dateMatches / keys.length > 0.8) {
    return {
      isMap: true,
      pattern: "date-like (YYYY-MM-DD or YYYY-MM)",
      sampleKeys: keys.slice(0, 3),
    };
  }

  const numericPattern = /^\d+$/;
  const numericMatches = keys.filter((k) => numericPattern.test(k)).length;
  if (numericMatches / keys.length > 0.8) {
    return {
      isMap: true,
      pattern: "numeric IDs",
      sampleKeys: keys.slice(0, 3),
    };
  }

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const uuidMatches = keys.filter((k) => uuidPattern.test(k)).length;
  if (uuidMatches / keys.length > 0.8) {
    return {
      isMap: true,
      pattern: "UUID-like",
      sampleKeys: keys.slice(0, 3),
    };
  }

  if (keys.length > maxSchemaKeys * 2) {
    return {
      isMap: true,
      pattern: "dynamic keys",
      sampleKeys: keys.slice(0, 3),
    };
  }

  return { isMap: false, sampleKeys: keys.slice(0, 3) };
}

/**
 * Recursively trims and annotates data structure
 */
function trimStructure(
  value: unknown,
  options: AnalysisOptions,
  depth = 0,
  keySchema?: Map<string, TypeInfo>,
): unknown {
  if (depth > 10) {
    return "... (max depth reached)";
  }

  if (value === null || value === undefined) {
    return value;
  }

  const type = typeof value;

  if (type === "string") {
    const str = value as string;
    if (str.length > options.maxStringLength) {
      return `${str.substring(0, options.maxStringLength)}... (${str.length} chars)`;
    }
    return str;
  }

  if (type === "number" || type === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { __meta: "array[0 items]", items: [] };
    }

    const schema = options.scanArrayForOptionalKeys
      ? scanArrayForSchema(value)
      : undefined;

    const trimmedItems = value
      .slice(0, options.maxArrayItems)
      .map((item) => trimStructure(item, options, depth + 1, schema));

    let schemaOutput: Record<string, unknown> | undefined;
    if (schema) {
      const schemaEntries = Array.from(schema.entries());
      if (schemaEntries.length > options.maxSchemaKeys) {
        const limitedEntries = schemaEntries.slice(0, options.maxSchemaKeys);
        schemaOutput = {
          __meta: `${schemaEntries.length} total keys, showing first ${options.maxSchemaKeys}`,
          ...Object.fromEntries(limitedEntries),
        };
      } else {
        schemaOutput = Object.fromEntries(schemaEntries);
      }
    }

    return {
      __meta: `array[${value.length} items]${value.length > options.maxArrayItems ? `, showing first ${options.maxArrayItems}` : ""}`,
      ...(schemaOutput && { __schema: schemaOutput }),
      items: trimmedItems,
    };
  }

  if (type === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);

    const mapPattern = detectMapPattern(keys, options.maxSchemaKeys);
    if (mapPattern.isMap && keys.length > options.maxSchemaKeys) {
      const sampleValues: unknown[] = [];
      const valueTypes = new Set<string>();
      const sampleEntries: Record<string, unknown> = {};

      for (let i = 0; i < Math.min(3, keys.length); i++) {
        const key = keys[i]!;
        const val = obj[key];
        sampleValues.push(val);
        const analysis = analyzeValue(val, options, depth);
        valueTypes.add(analysis.type);
        sampleEntries[key] = trimStructure(val, options, depth + 1);
      }

      return {
        __meta: `map[${keys.length} keys, ${mapPattern.pattern}]`,
        __keyPattern: mapPattern.pattern,
        __sampleKeys: mapPattern.sampleKeys,
        __valueType:
          valueTypes.size === 1
            ? Array.from(valueTypes)[0]
            : Array.from(valueTypes),
        __samples: sampleEntries,
      };
    }

    const trimmed: Record<string, unknown> = {};
    const keysToProcess =
      keys.length > options.maxSchemaKeys
        ? keys.slice(0, options.maxSchemaKeys)
        : keys;

    for (const key of keysToProcess) {
      const val = obj[key];
      const analysis = analyzeValue(val, options, depth);
      let trimmedValue = trimStructure(val, options, depth + 1);

      if (keySchema?.has(key)) {
        const info = keySchema.get(key)!;
        if (info.optional) {
          trimmedValue = {
            __optional: true,
            __presence: `${info.presence}%`,
            value: trimmedValue,
          };
        }
        if (info.unionTypes && info.unionTypes.size > 1) {
          trimmedValue = {
            ...((trimmedValue as Record<string, unknown>) || {}),
            __unionTypes: Array.from(info.unionTypes),
          };
        }
      }

      trimmed[key] = trimmedValue;
    }

    if (keys.length > options.maxSchemaKeys) {
      trimmed.__meta = `${keys.length} total keys, showing first ${options.maxSchemaKeys}`;
    }

    return trimmed;
  }

  return value;
}

/**
 * Formats the output for console logging
 */
function formatOutput(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

// ============================================================================
// File Discovery & Reading
// ============================================================================

/**
 * Discover and categorize all files in the Hinge export folder
 */
function discoverFiles(folderPath: string): DiscoveredFiles {
  const discovered: DiscoveredFiles = {
    core: {},
    additional: [],
    ignored: [],
  };

  const items = fs.readdirSync(folderPath);

  for (const item of items) {
    const itemPath = path.join(folderPath, item);
    const stat = fs.statSync(itemPath);

    if (stat.isDirectory() && item.toLowerCase() === "media") {
      // Count media files
      const mediaFiles = fs.readdirSync(itemPath);
      const filesByType: Record<string, number> = {};

      for (const mediaFile of mediaFiles) {
        const ext = path.extname(mediaFile).toLowerCase().replace(".", "");
        if (ext) {
          filesByType[ext] = (filesByType[ext] || 0) + 1;
        }
      }

      discovered.mediaFolder = {
        path: itemPath,
        filesByType,
        totalFiles: mediaFiles.length,
      };
    } else if (stat.isFile()) {
      const fileName = item.toLowerCase();

      if (fileName.endsWith(".json")) {
        // Ignore selfie verification files
        if (fileName.includes("selfie") || fileName.includes("verification")) {
          discovered.ignored.push(itemPath);
        }
        // Categorize JSON files
        else if (fileName.includes("user")) {
          discovered.core.user = itemPath;
        } else if (fileName.includes("match")) {
          discovered.core.matches = itemPath;
        } else if (
          fileName.includes("prompt") &&
          !fileName.includes("feedback")
        ) {
          discovered.core.prompts = itemPath;
        } else {
          discovered.additional.push(itemPath);
        }
      } else if (fileName.endsWith(".html") || fileName.endsWith(".txt")) {
        discovered.ignored.push(itemPath);
      }
    }
  }

  return discovered;
}

/**
 * Type guards for file detection (imported concept from extract-hinge-data.ts)
 */
function isUserFile(data: unknown): boolean {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return !!(obj.preferences || obj.identity || obj.account || obj.profile);
}

function isMatchesFile(data: unknown): boolean {
  if (!Array.isArray(data)) return false;
  return (
    data.length === 0 ||
    (typeof data[0] === "object" &&
      data[0] !== null &&
      ("chats" in data[0] ||
        "like" in data[0] ||
        "match" in data[0] ||
        "block" in data[0] ||
        "we_met" in data[0]))
  );
}

function isPromptsFile(data: unknown): boolean {
  if (!Array.isArray(data)) return false;
  return (
    data.length === 0 ||
    (typeof data[0] === "object" &&
      data[0] !== null &&
      "prompt" in data[0] &&
      ("text" in data[0] || "options" in data[0]) && // Accept either text or options (for poll prompts)
      "type" in data[0])
  );
}

// ============================================================================
// Extraction Coverage Analysis
// ============================================================================

/**
 * Analyze extraction coverage for Hinge data
 */
function analyzeExtractionCoverage(
  combinedData: any,
  additionalFiles: Record<string, any>,
): void {
  console.log("🔬 Data Extraction Coverage Analysis:");
  console.log();

  // User Object Coverage
  if (combinedData.User && typeof combinedData.User === "object") {
    console.log("📋 User Object Analysis:");

    const userKeys = Object.keys(combinedData.User);
    console.log(`   Total top-level keys: ${userKeys.join(", ")}`);
    console.log();

    // Preferences
    if (combinedData.User.preferences) {
      const prefKeys = Object.keys(combinedData.User.preferences);
      console.log(`   Preferences (${prefKeys.length} fields):`);
      const dealbreakers = prefKeys.filter((k) => k.includes("dealbreaker"));
      console.log(`      - ${dealbreakers.length} dealbreaker fields`);
      console.log(`      - Sample: ${prefKeys.slice(0, 5).join(", ")}...`);
    }

    // Identity
    if (combinedData.User.identity) {
      const identityKeys = Object.keys(combinedData.User.identity);
      console.log(
        `   Identity (${identityKeys.length} fields): ${identityKeys.join(", ")}`,
      );
    }

    // Account
    if (combinedData.User.account) {
      const accountKeys = Object.keys(combinedData.User.account);
      console.log(
        `   Account (${accountKeys.length} fields): ${accountKeys.join(", ")}`,
      );
    }

    // Profile
    if (combinedData.User.profile) {
      const profileKeys = Object.keys(combinedData.User.profile);
      console.log(`   Profile (${profileKeys.length} fields):`);
      console.log(`      - Sample: ${profileKeys.slice(0, 8).join(", ")}...`);
    }

    // Installs
    if (
      combinedData.User.installs &&
      Array.isArray(combinedData.User.installs)
    ) {
      console.log(
        `   Installs: ${combinedData.User.installs.length} install(s)`,
      );
      if (combinedData.User.installs.length > 0) {
        const installKeys = Object.keys(combinedData.User.installs[0]);
        console.log(`      - Keys: ${installKeys.join(", ")}`);
      }
    }
  }
  console.log();

  // Matches/Conversations Coverage
  if (combinedData.Matches && Array.isArray(combinedData.Matches)) {
    console.log(
      `💬 Matches/Conversations: ${combinedData.Matches.length} total`,
    );

    const conversationTypes = {
      chats: 0,
      like: 0,
      match: 0,
      block: 0,
      we_met: 0,
    };

    let totalMessages = 0;

    for (const conversation of combinedData.Matches) {
      if (conversation.chats) {
        conversationTypes.chats++;
        totalMessages += conversation.chats.length;
      }
      if (conversation.like) conversationTypes.like++;
      if (conversation.match) conversationTypes.match++;
      if (conversation.block) conversationTypes.block++;
      if (conversation.we_met) conversationTypes.we_met++;
    }

    console.log(`   Breakdown:`);
    console.log(`      - With chats: ${conversationTypes.chats}`);
    console.log(`      - With likes: ${conversationTypes.like}`);
    console.log(`      - With matches: ${conversationTypes.match}`);
    console.log(`      - With blocks: ${conversationTypes.block}`);
    console.log(`      - With we_met: ${conversationTypes.we_met}`);
    console.log(`   Total messages: ${totalMessages}`);

    // Sample message structure
    const sampleConvWithChat = combinedData.Matches.find(
      (c: any) => c.chats && c.chats.length > 0,
    );
    if (sampleConvWithChat?.chats[0]) {
      const msgKeys = Object.keys(sampleConvWithChat.chats[0]);
      console.log(`   Message keys: ${msgKeys.join(", ")}`);
    }
  }
  console.log();

  // Prompts Coverage
  if (combinedData.Prompts && Array.isArray(combinedData.Prompts)) {
    console.log(`💭 Prompts: ${combinedData.Prompts.length} total`);

    const typeDistribution: Record<string, number> = {};
    for (const prompt of combinedData.Prompts) {
      const type = prompt.type || "unknown";
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    }

    console.log(`   Type distribution:`);
    for (const [type, count] of Object.entries(typeDistribution)) {
      console.log(`      - ${type}: ${count}`);
    }

    if (combinedData.Prompts.length > 0) {
      const promptKeys = Object.keys(combinedData.Prompts[0]);
      console.log(`   Prompt object keys: ${promptKeys.join(", ")}`);
    }
  }
  console.log();

  // Additional Files Analysis
  if (Object.keys(additionalFiles).length > 0) {
    console.log(`🆕 Additional Files Found (not in core extraction):`);
    for (const [fileName, data] of Object.entries(additionalFiles)) {
      const baseName = path.basename(fileName);
      console.log(`   - ${baseName}:`);

      if (Array.isArray(data)) {
        console.log(`      Type: array[${data.length} items]`);
        if (data.length > 0 && typeof data[0] === "object") {
          const keys = Object.keys(data[0]);
          console.log(
            `      Sample keys: ${keys.slice(0, 5).join(", ")}${keys.length > 5 ? "..." : ""}`,
          );
        }
      } else if (typeof data === "object" && data !== null) {
        const keys = Object.keys(data);
        console.log(`      Type: object`);
        console.log(
          `      Keys (${keys.length}): ${keys.slice(0, 5).join(", ")}${keys.length > 5 ? "..." : ""}`,
        );
      } else {
        console.log(`      Type: ${typeof data}`);
      }
    }
    console.log();
    console.log(
      `   ⚠️  These files are NOT currently handled by extract-hinge-data.ts`,
    );
    console.log(
      `   Consider adding them to types/extraction if they contain useful data`,
    );
  }
  console.log();
}

// ============================================================================
// Main Analysis Function
// ============================================================================

/**
 * Main analysis function
 */
function analyzeHingeDataFolder(folderPath: string, options: AnalysisOptions) {
  console.log("=".repeat(80));
  console.log(`Analyzing Hinge Data Export Folder: ${folderPath}`);
  console.log("=".repeat(80));
  console.log();

  // Step 1: Discover files
  console.log("📂 File Discovery Report:");
  const discovered = discoverFiles(folderPath);

  console.log();
  console.log("Core Files:");
  console.log(
    `  ✓ user.json: ${discovered.core.user ? "Found" : "❌ Missing"}`,
  );
  console.log(
    `  ✓ matches.json: ${discovered.core.matches ? "Found" : "❌ Missing"}`,
  );
  console.log(
    `  ✓ prompts.json: ${discovered.core.prompts ? "Found" : "❌ Missing"}`,
  );

  if (discovered.additional.length > 0) {
    console.log();
    console.log(`Additional JSON Files (${discovered.additional.length}):`);
    for (const filePath of discovered.additional) {
      console.log(`  + ${path.basename(filePath)}`);
    }
  }

  if (discovered.mediaFolder) {
    console.log();
    console.log("Media Folder:");
    console.log(`  📁 ${discovered.mediaFolder.totalFiles} files total`);
    for (const [ext, count] of Object.entries(
      discovered.mediaFolder.filesByType,
    )) {
      console.log(`     - ${ext}: ${count}`);
    }
  }

  if (discovered.ignored.length > 0) {
    console.log();
    console.log(`Ignored Files (${discovered.ignored.length}):`);
    for (const filePath of discovered.ignored) {
      console.log(`  - ${path.basename(filePath)}`);
    }
  }

  console.log();
  console.log("-".repeat(80));
  console.log();

  // Step 2: Read and parse JSON files
  const parsedFiles: Record<string, any> = {};
  const coreFiles: any[] = [];
  const additionalFiles: Record<string, any> = {};

  // Read core files
  for (const [type, filePath] of Object.entries(discovered.core)) {
    if (filePath) {
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const data = JSON.parse(content);
        parsedFiles[type] = data;
        coreFiles.push(data);
        console.log(
          `✓ Parsed ${type}.json (${(content.length / 1024).toFixed(2)} KB)`,
        );
      } catch (error) {
        console.error(`❌ Failed to parse ${type}.json:`, error);
      }
    }
  }

  // Read additional files
  for (const filePath of discovered.additional) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(content);
      additionalFiles[filePath] = data;
      console.log(
        `✓ Parsed ${path.basename(filePath)} (${(content.length / 1024).toFixed(2)} KB)`,
      );
    } catch (error) {
      console.error(`❌ Failed to parse ${path.basename(filePath)}:`, error);
    }
  }

  console.log();

  // Step 3: Combine core files (simple version, not importing from extract-hinge-data.ts)
  const combinedData: any = {
    User: parsedFiles.user || {},
    Matches: parsedFiles.matches || [],
    Prompts: parsedFiles.prompts || [],
  };

  // Step 4: Show basic statistics
  console.log("📊 Data Statistics:");
  console.log(`  - User object keys: ${Object.keys(combinedData.User).length}`);
  console.log(`  - Total conversations: ${combinedData.Matches.length}`);
  console.log(`  - Total prompts: ${combinedData.Prompts.length}`);
  console.log();

  // Step 5: Extraction Coverage Analysis
  analyzeExtractionCoverage(combinedData, additionalFiles);

  // Step 6: Trimmed Structure Output
  console.log("📋 Trimmed Structure:");
  console.log("(Copy the JSON below to analyze with AI)");
  console.log();
  console.log("-".repeat(80));

  const trimmed = trimStructure(combinedData, options);
  console.log(formatOutput(trimmed));

  console.log("-".repeat(80));
  console.log();

  // If there are additional files, show their structure too
  if (Object.keys(additionalFiles).length > 0) {
    console.log("📋 Additional Files Structure:");
    console.log();
    console.log("-".repeat(80));

    for (const [filePath, data] of Object.entries(additionalFiles)) {
      console.log(`\n### ${path.basename(filePath)} ###\n`);
      const trimmedAdditional = trimStructure(data, {
        ...options,
        maxArrayItems: 2,
      });
      console.log(formatOutput(trimmedAdditional));
    }

    console.log("-".repeat(80));
    console.log();
  }

  console.log("✅ Analysis complete!");
  console.log();
  console.log("💡 Tips:");
  console.log(
    "  - Fields marked with '__optional' appear in less than 100% of array items",
  );
  console.log("  - '__meta' shows array lengths and sampling info");
  console.log("  - '__schema' shows all discovered keys across array items");
  console.log(
    "  - '__unionTypes' indicates fields with multiple possible types",
  );
  console.log();
}

// ============================================================================
// CLI Interface
// ============================================================================

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("❌ Error: No folder path provided");
    console.log();
    console.log("Usage:");
    console.log(
      "  bun apps/swipestats/src/scripts/hinge-data-json-analysis.ts <path-to-unzipped-folder> [options]",
    );
    console.log();
    console.log("Options:");
    console.log(
      "  --max-array-items=N     Limit array items shown (default: 3)",
    );
    console.log(
      "  --max-string-length=N   Truncate long strings (default: 100)",
    );
    console.log(
      "  --max-schema-keys=N     Limit schema keys shown (default: 20)",
    );
    console.log("  --no-scan-arrays        Disable array schema scanning");
    console.log();
    console.log("Example:");
    console.log(
      "  bun apps/swipestats/src/scripts/hinge-data-json-analysis.ts ~/Downloads/hinge-export",
    );
    process.exit(1);
  }

  const folderPath = args[0]!;

  // Resolve path
  const resolvedPath = path.resolve(folderPath);

  // Check if folder exists
  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ Error: Folder not found: ${resolvedPath}`);
    process.exit(1);
  }

  // Check if it's a directory
  const stats = fs.statSync(resolvedPath);
  if (!stats.isDirectory()) {
    console.error(`❌ Error: Path is not a directory: ${resolvedPath}`);
    process.exit(1);
  }

  // Parse options from additional arguments
  const options: AnalysisOptions = {
    maxArrayItems: 3,
    maxStringLength: 100,
    scanArrayForOptionalKeys: true,
    maxSchemaKeys: 20,
  };

  // Allow overriding defaults
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;

    if (arg.startsWith("--max-array-items=")) {
      const value = arg.split("=")[1];
      if (value) {
        options.maxArrayItems = parseInt(value, 10);
      }
    } else if (arg.startsWith("--max-string-length=")) {
      const value = arg.split("=")[1];
      if (value) {
        options.maxStringLength = parseInt(value, 10);
      }
    } else if (arg === "--no-scan-arrays") {
      options.scanArrayForOptionalKeys = false;
    } else if (arg.startsWith("--max-schema-keys=")) {
      const value = arg.split("=")[1];
      if (value) {
        options.maxSchemaKeys = parseInt(value, 10);
      }
    }
  }

  try {
    analyzeHingeDataFolder(resolvedPath, options);
  } catch (error) {
    console.error("❌ Error analyzing folder:");
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { analyzeHingeDataFolder, trimStructure, scanArrayForSchema };
