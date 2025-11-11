/**
 * Script to update all service files to use centralized config
 * Run with: node update-api-urls.js
 */

const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/services/runsService.ts',
  'src/services/comparisonsService.ts',
  'src/stores/jobsSlice.ts',
  'src/services/jobsService.ts',
  'src/services/surveysService.ts',
  'src/services/wellsService.ts',
  'src/services/locationsService.ts',
  'src/services/activityLogService.ts',
  'src/services/duplicateSurveyService.ts',
  'src/services/extrapolationService.ts',
  'src/services/adjustmentService.ts',
  'src/services/tieonsService.ts',
  'src/services/depthsService.ts',
  'src/stores/wellsSlice.ts',
  'src/stores/runsSlice.ts',
];

const oldPattern = /const API_BASE_URL = \(typeof process !== 'undefined' && process\.env\?\.VITE_API_URL\) \|\| ['"]https?:\/\/localhost:8000['"];?/g;
const newCode = `import config from '../config/env';\n\nconst API_BASE_URL = config.apiBaseUrl;`;

// For store files, the import path is different
const storeImportPath = `import config from '../config/env';`;

let updatedCount = 0;
let errorCount = 0;

filesToUpdate.forEach((file) => {
  const filePath = path.join(__dirname, file);

  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Check if file contains the old pattern
    if (!oldPattern.test(content)) {
      console.log(`⚠️  Skipped (pattern not found): ${file}`);
      return;
    }

    // Reset regex lastIndex
    oldPattern.lastIndex = 0;

    // Check if already has config import
    if (content.includes("import config from '../config/env'")) {
      console.log(`ℹ️  Already updated: ${file}`);
      return;
    }

    // Replace the old pattern
    content = content.replace(oldPattern, 'const API_BASE_URL = config.apiBaseUrl;');

    // Add import at the top after other imports
    const importRegex = /(import.*from.*['"];?\n)+/;
    const match = content.match(importRegex);

    if (match) {
      const lastImportEnd = match[0].length + match.index;
      const beforeImports = content.substring(0, lastImportEnd);
      const afterImports = content.substring(lastImportEnd);

      // Add config import
      content = beforeImports + storeImportPath + '\n' + afterImports;
    }

    // Write the updated content back
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${file}`);
    updatedCount++;

  } catch (error) {
    console.error(`❌ Error updating ${file}:`, error.message);
    errorCount++;
  }
});

console.log(`\n📊 Summary:`);
console.log(`   ✅ Updated: ${updatedCount} files`);
console.log(`   ❌ Errors: ${errorCount} files`);
console.log(`\n🎉 Done! Please restart your dev server.`);
