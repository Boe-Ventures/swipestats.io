#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";

interface Descriptor {
  name: string;
  choices: string[];
  visibility: string;
}

interface TinderDataUser {
  descriptors?: Descriptor[];
  [key: string]: unknown;
}

interface TinderData {
  User: TinderDataUser;
  [key: string]: unknown;
}

/**
 * Extracts and logs descriptors from all Tinder JSON files in a directory
 */
function extractDescriptorsFromDirectory(dirPath: string) {
  console.log("=".repeat(80));
  console.log("🔍 Extracting Descriptors from Tinder Data Files");
  console.log("=".repeat(80));
  console.log();

  // Resolve the directory path
  const resolvedPath = path.resolve(dirPath);

  // Check if directory exists
  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ Error: Directory not found: ${resolvedPath}`);
    process.exit(1);
  }

  // Check if it's a directory
  const stats = fs.statSync(resolvedPath);
  if (!stats.isDirectory()) {
    console.error(`❌ Error: Path is not a directory: ${resolvedPath}`);
    process.exit(1);
  }

  // Read all files in the directory
  const files = fs.readdirSync(resolvedPath);
  const jsonFiles = files.filter((file) => file.endsWith(".json"));

  console.log(`📁 Found ${jsonFiles.length} JSON files in ${dirPath}\n`);

  // Track all unique descriptor names and choices
  const allDescriptorNames = new Set<string>();
  const descriptorChoicesByName = new Map<string, Set<string>>();

  // Process each file
  jsonFiles.forEach((file, index) => {
    const filePath = path.join(resolvedPath, file);
    console.log(`\n${"─".repeat(80)}`);
    console.log(`📄 File ${index + 1}/${jsonFiles.length}: ${file}`);
    console.log("─".repeat(80));

    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(fileContent) as TinderData;

      if (!data.User) {
        console.log("⚠️  No User object found in this file");
        return;
      }

      const descriptors = data.User.descriptors;

      if (!descriptors || descriptors.length === 0) {
        console.log("❌ No descriptors found");
        return;
      }

      console.log(`✅ Found ${descriptors.length} descriptors:\n`);

      descriptors.forEach((descriptor) => {
        console.log(`  📌 ${descriptor.name}`);
        console.log(`     Choices: ${descriptor.choices.join(", ")}`);
        console.log(`     Visibility: ${descriptor.visibility}`);
        console.log();

        // Track for summary
        allDescriptorNames.add(descriptor.name);
        if (!descriptorChoicesByName.has(descriptor.name)) {
          descriptorChoicesByName.set(descriptor.name, new Set());
        }
        descriptor.choices.forEach((choice) => {
          descriptorChoicesByName.get(descriptor.name)!.add(choice);
        });
      });
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error);
    }
  });

  // Print summary
  console.log("\n" + "=".repeat(80));
  console.log("📊 SUMMARY: All Unique Descriptor Types Across All Files");
  console.log("=".repeat(80));
  console.log();

  if (allDescriptorNames.size === 0) {
    console.log("❌ No descriptors found in any files");
  } else {
    console.log(`Found ${allDescriptorNames.size} unique descriptor types:\n`);

    Array.from(allDescriptorNames)
      .sort()
      .forEach((name) => {
        const choices = Array.from(descriptorChoicesByName.get(name)!).sort();
        console.log(`  📌 ${name}`);
        console.log(`     All observed choices (${choices.length}):`);
        choices.forEach((choice) => {
          console.log(`       • ${choice}`);
        });
        console.log();
      });
  }

  console.log("=".repeat(80));
  console.log("✅ Extraction complete!");
  console.log();
}

// CLI Interface
function main() {
  const args = process.argv.slice(2);
  const dirPath = args[0] || "test-data/tinder-uploads";

  extractDescriptorsFromDirectory(dirPath);
}

// Run if called directly
if (require.main === module) {
  main();
}

export { extractDescriptorsFromDirectory };
