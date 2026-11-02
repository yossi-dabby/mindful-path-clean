import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');
const reportsDir = path.join(projectRoot, 'reports');
const allowedExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
// Regex for named imports from lucide-react. Uses [^}]* (stops at first closing brace)
// to avoid crossing adjacent import statements. Handles multi-line imports. Assumes
// well-formed import syntax (no nested braces inside the import block).
const lucideImportRegex = /import\s*\{([^}]*)\}\s*from\s*['\"]lucide-react['\"]/g;

async function getSourceFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const sortedEntries = [...entries].sort((a, b) => a.name.localeCompare(b.name));
  const files = [];

  for (const entry of sortedEntries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...await getSourceFiles(fullPath));
      continue;
    }

    if (entry.isFile() && allowedExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function parseLucideImports(source) {
  const matches = [];

  for (const match of source.matchAll(lucideImportRegex)) {
    const block = match[1];
    const specifiers = block
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    for (const specifier of specifiers) {
      const cleaned = specifier.replace(/^type\s+/, '').trim();
      if (!cleaned) continue;

      const aliasMatch = cleaned.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
      if (aliasMatch) {
        matches.push({ imported: aliasMatch[1], local: aliasMatch[2] });
        continue;
      }

      const directMatch = cleaned.match(/^([A-Za-z_$][\w$]*)$/);
      if (directMatch) {
        matches.push({ imported: directMatch[1], local: directMatch[1] });
      }
    }
  }

  return matches;
}

async function generateReports() {
  const sourceFiles = await getSourceFiles(srcDir);
  const byFile = {};
  const uniqueLocalIcons = new Set();

  for (const filePath of sourceFiles) {
    const source = await fs.readFile(filePath, 'utf8');
    const imports = parseLucideImports(source);

    if (imports.length === 0) continue;

    const relativePath = path.relative(projectRoot, filePath).split(path.sep).join('/');
    byFile[relativePath] = imports;

    for (const item of imports) {
      uniqueLocalIcons.add(item.local);
    }
  }

  const sortedByFile = Object.fromEntries(
    Object.keys(byFile)
      .sort((a, b) => a.localeCompare(b))
      .map((filePath) => [filePath, byFile[filePath]])
  );

  const sortedLocalIcons = [...uniqueLocalIcons].sort((a, b) => a.localeCompare(b));

  await fs.mkdir(reportsDir, { recursive: true });
  await fs.writeFile(
    path.join(reportsDir, 'lucide-icons.json'),
    `${JSON.stringify(sortedLocalIcons, null, 2)}\n`,
    'utf8'
  );
  await fs.writeFile(
    path.join(reportsDir, 'lucide-icons-by-file.json'),
    `${JSON.stringify(sortedByFile, null, 2)}\n`,
    'utf8'
  );

  console.log(`Files with lucide imports: ${Object.keys(sortedByFile).length}`);
  console.log(`Unique local icons: ${sortedLocalIcons.length}`);
}

generateReports().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});