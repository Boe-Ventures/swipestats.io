#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as fs from "fs";
import * as path from "path";

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
  presence?: number; // percentage of items where this key appears
  sampleValues?: unknown[];
}

/**
 * Analyzes the structure of a value and returns type information
 */
function analyzeValue(
  value: unknown,
  options: AnalysisOptions,
  _depth = 0,
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

        // Store sample values (up to 2 for conciseness)
        if (info.sampleValues!.length < 2) {
          info.sampleValues!.push(value);
        }
      }
    }
  }

  // Calculate presence percentage
  for (const info of keyInfo.values()) {
    info.presence = Math.round((info.presence! / arr.length) * 100);
    info.optional = info.presence < 100;
  }

  return keyInfo;
}

/**
 * Detects if an object appears to be a map-like structure (e.g., date-keyed, ID-keyed)
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

  // Check for date-like patterns (YYYY-MM-DD, YYYY-MM, etc.)
  const datePattern = /^\d{4}-\d{2}(-\d{2})?$/;
  const dateMatches = keys.filter((k) => datePattern.test(k)).length;
  if (dateMatches / keys.length > 0.8) {
    return {
      isMap: true,
      pattern: "date-like (YYYY-MM-DD or YYYY-MM)",
      sampleKeys: keys.slice(0, 3),
    };
  }

  // Check for numeric ID patterns
  const numericPattern = /^\d+$/;
  const numericMatches = keys.filter((k) => numericPattern.test(k)).length;
  if (numericMatches / keys.length > 0.8) {
    return {
      isMap: true,
      pattern: "numeric IDs",
      sampleKeys: keys.slice(0, 3),
    };
  }

  // Check for UUID-like patterns
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

  // If object has many keys but no clear pattern, still treat as map if > threshold
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
  currentKey?: string,
): unknown {
  // Prevent infinite recursion
  if (depth > 10) {
    return "... (max depth reached)";
  }

  if (value === null || value === undefined) {
    return value;
  }

  const type = typeof value;

  // Handle primitives
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

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { __meta: "array[0 items]", items: [] };
    }

    const schema = options.scanArrayForOptionalKeys
      ? scanArrayForSchema(value)
      : undefined;

    const trimmedItems = value
      .slice(0, options.maxArrayItems)
      .map((item) =>
        trimStructure(item, options, depth + 1, schema, currentKey),
      );

    // Limit schema keys for readability
    let schemaOutput: Record<string, unknown> | undefined;
    if (schema) {
      const schemaEntries = Array.from(schema.entries());
      if (schemaEntries.length > options.maxSchemaKeys) {
        // Show summary instead of all keys
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

  // Handle objects
  if (type === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);

    // Special handling for User object: always show full structure
    const isUserObject = currentKey === "User" && depth === 1;

    // Check if this looks like a map-like structure (but not for User object)
    const mapPattern = detectMapPattern(keys, options.maxSchemaKeys);
    if (
      !isUserObject &&
      mapPattern.isMap &&
      keys.length > options.maxSchemaKeys
    ) {
      // Analyze value types from sample entries
      const sampleValues: unknown[] = [];
      const valueTypes = new Set<string>();
      const sampleEntries: Record<string, unknown> = {};

      for (let i = 0; i < Math.min(3, keys.length); i++) {
        const key = keys[i]!;
        const val = obj[key];
        sampleValues.push(val);
        const analysis = analyzeValue(val, options, depth);
        valueTypes.add(analysis.type);
        sampleEntries[key] = trimStructure(
          val,
          options,
          depth + 1,
          undefined,
          key,
        );
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

    // Regular object handling - limit keys if too many (except for User object)
    const trimmed: Record<string, unknown> = {};
    const keysToProcess =
      !isUserObject && keys.length > options.maxSchemaKeys
        ? keys.slice(0, options.maxSchemaKeys)
        : keys;

    for (const key of keysToProcess) {
      const val = obj[key];
      const analysis = analyzeValue(val, options, depth);
      let trimmedValue = trimStructure(val, options, depth + 1, undefined, key);

      // Add metadata if we have schema info
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

    // Add meta if we truncated keys (except for User object which we always show in full)
    if (!isUserObject && keys.length > options.maxSchemaKeys) {
      trimmed.__meta = `${keys.length} total keys, showing first ${options.maxSchemaKeys}`;
    }

    return trimmed;
  }

  return value;
}

/**
 * Formats the output for console logging with better readability
 */
function formatOutput(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Analyzes potential data extraction issues
 */
function analyzeExtractionCoverage(data: any): void {
  console.log("🔬 Data Extraction Coverage Analysis:");
  console.log();

  // Check User object coverage
  if (data.User && typeof data.User === "object") {
    const userKeys = Object.keys(data.User);
    console.log(`📋 User object has ${userKeys.length} keys`);

    // Common fields we might miss
    const potentiallyUnextracted = [];
    const commonExtracted = [
      "active_time",
      "age_filter_max",
      "age_filter_min",
      "birth_date",
      "create_date",
      "gender",
      "gender_filter",
      "interested_in",
      "bio",
      "city",
      "education",
      "interests",
      "jobs",
      "schools",
      "descriptors",
      "ip_address",
      "is_traveling",
      "pos",
      "user_interests",
      "sexual_orientations",
    ];

    for (const key of userKeys) {
      if (!commonExtracted.includes(key)) {
        potentiallyUnextracted.push(key);
      }
    }

    if (potentiallyUnextracted.length > 0) {
      console.log(
        `⚠️  Potentially unextracted User fields (${potentiallyUnextracted.length}):`,
      );
      potentiallyUnextracted.forEach((k) => console.log(`   - ${k}`));
    } else {
      console.log("✅ All common User fields appear to be known");
    }
  }
  console.log();

  // Check Messages structure
  if (data.Messages && Array.isArray(data.Messages)) {
    console.log(`💬 Messages: ${data.Messages.length} matches`);
    const totalMessages = data.Messages.reduce(
      (sum: number, m: any) => sum + (m.messages?.length || 0),
      0,
    );
    console.log(`   Total messages across all matches: ${totalMessages}`);

    // Sample message to check for new fields
    const messageWithContent = data.Messages.find(
      (m: any) => m.messages && m.messages.length > 0,
    );
    if (messageWithContent?.messages[0]) {
      const msgKeys = Object.keys(messageWithContent.messages[0]);
      console.log(`   Message object keys: ${msgKeys.join(", ")}`);
    }
  }
  console.log();

  // Check Usage data coverage
  if (data.Usage && typeof data.Usage === "object") {
    const usageKeys = Object.keys(data.Usage);
    console.log(`📊 Usage has ${usageKeys.length} metric types:`);
    usageKeys.forEach((k) => {
      const values = data.Usage[k];
      if (typeof values === "object" && values !== null) {
        const count = Object.keys(values).length;
        console.log(`   - ${k}: ${count} data points`);
      }
    });
  }
  console.log();

  // Check for new top-level fields
  const expectedTopLevel = [
    "Usage",
    "Campaigns",
    "Experiences",
    "Purchases",
    "Photos",
    "Spotify",
    "Messages",
    "RoomsAndInteractions",
    "SwipeNotes",
    "SwipeParty",
    "StudentVerifications",
    "User",
  ];

  const actualKeys = Object.keys(data);
  const newFields = actualKeys.filter((k) => !expectedTopLevel.includes(k));

  if (newFields.length > 0) {
    console.log(`🆕 New/unexpected top-level fields (${newFields.length}):`);
    newFields.forEach((k) => {
      const value = data[k];
      const type = Array.isArray(value)
        ? `array[${value.length}]`
        : typeof value;
      console.log(`   - ${k}: ${type}`);
    });
  }
  console.log();
}

/**
 * Main analysis function
 */
function analyzeDataJSON(filePath: string, options: AnalysisOptions) {
  console.log("=".repeat(80));
  console.log(`Analyzing Tinder Data JSON: ${filePath}`);
  console.log("=".repeat(80));
  console.log();

  // Read and parse the JSON file
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(fileContent);

  console.log("📊 File Statistics:");
  console.log(
    `  - File size: ${(fileContent.length / 1024 / 1024).toFixed(2)} MB`,
  );
  console.log(`  - Top-level keys: ${Object.keys(data).length}`);
  console.log();

  // Analyze top-level structure
  console.log("🔍 Top-level Structure:");
  for (const [key, value] of Object.entries(data)) {
    const analysis = analyzeValue(value, options);
    console.log(
      `  - ${key}: ${analysis.type}${analysis.details ? ` (${analysis.details})` : ""}`,
    );
  }
  console.log();

  // NEW: Analyze extraction coverage
  analyzeExtractionCoverage(data);

  // Create trimmed structure
  console.log("📋 Trimmed Structure:");
  console.log("(Copy the JSON below to analyze with AI)");
  console.log();
  console.log("-".repeat(80));

  const trimmed = trimStructure(data, options);
  console.log(formatOutput(trimmed));

  console.log("-".repeat(80));
  console.log();
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

// CLI Interface
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("❌ Error: No file path provided");
    console.log();
    console.log("Usage:");
    console.log(
      "  bun apps/swipestats/src/scripts/tinder-data-json-analysis.ts <path-to-data.json> [options]",
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
      "  bun apps/swipestats/src/scripts/tinder-data-json-analysis.ts ~/Downloads/data.json",
    );
    process.exit(1);
  }

  const filePath = args[0]!; // Safe because we check args.length above

  // Resolve path
  const resolvedPath = path.resolve(filePath);

  // Check if file exists
  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ Error: File not found: ${resolvedPath}`);
    process.exit(1);
  }

  // Check if it's a file
  const stats = fs.statSync(resolvedPath);
  if (!stats.isFile()) {
    console.error(`❌ Error: Path is not a file: ${resolvedPath}`);
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
    analyzeDataJSON(resolvedPath, options);
  } catch (error) {
    console.error("❌ Error analyzing file:");
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { analyzeDataJSON, trimStructure, scanArrayForSchema };
