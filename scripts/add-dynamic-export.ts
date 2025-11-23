import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const DYNAMIC_EXPORT = "export const dynamic = 'force-dynamic';\n\n";

function findRouteFiles(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir);

  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      findRouteFiles(filePath, fileList);
    } else if (file === 'route.ts') {
      fileList.push(filePath);
    }
  }

  return fileList;
}

async function addDynamicExport() {
  // Find all API route files
  const files = findRouteFiles('src/app/api');

  let updated = 0;
  let skipped = 0;

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');

    // Skip if already has the export
    if (content.includes("export const dynamic")) {
      console.log(`⏭️  Skipped (already has dynamic export): ${file}`);
      skipped++;
      continue;
    }

    // Find where to insert (after imports, before first comment or code)
    const lines = content.split('\n');
    let insertIndex = 0;

    // Find the last import statement
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('import ') || line.startsWith('import{') || line.startsWith('import{')) {
        insertIndex = i + 1;
      }
      // Stop at first non-import, non-empty line
      if (line && !line.startsWith('import') && !line.startsWith('//') && insertIndex > 0) {
        break;
      }
    }

    // Insert the export after imports
    const newContent = [
      ...lines.slice(0, insertIndex),
      '',
      DYNAMIC_EXPORT.trimEnd(),
      ...lines.slice(insertIndex)
    ].join('\n');

    writeFileSync(file, newContent, 'utf-8');
    console.log(`✅ Updated: ${file}`);
    updated++;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Updated: ${updated} files`);
  console.log(`   ⏭️  Skipped: ${skipped} files`);
  console.log(`   📁 Total: ${files.length} files`);
}

addDynamicExport().catch(console.error);
