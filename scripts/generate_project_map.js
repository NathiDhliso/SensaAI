import fs from 'fs';
import path from 'path';

const rootDir = 'c:/Users/nathi/OneDrive/Documents/Projects/SensaPBL';
const outputFile = 'c:/Users/nathi/OneDrive/Documents/Projects/SensaPBL/project_tree.md';

const EXCLUDED_DIRS = [
    'node_modules',
    '.git',
    '.idea',
    '.vscode',
    'dist',
    'build',
    'coverage',
    '.next',
    '__pycache__'
];

const EXCLUDED_EXTENSIONS = [
    '.zip',
    '.map',
    '.log',
    '.lock'
];

function generateTree(dir, prefix = '') {
    let output = '';
    const name = path.basename(dir);

    // Skip if excluded
    if (EXCLUDED_DIRS.includes(name)) return '';

    let items;
    try {
        items = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
        return '';
    }

    // Sort: Directories first, then files
    items.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
    });

    // Filter out excluded items
    items = items.filter(item => {
        if (item.isDirectory()) {
            return !EXCLUDED_DIRS.includes(item.name);
        }
        const ext = path.extname(item.name).toLowerCase();
        return !EXCLUDED_EXTENSIONS.includes(ext) && item.name !== 'package-lock.json';
    });

    items.forEach((item, index) => {
        const isLast = index === items.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        const childPrefix = isLast ? '    ' : '│   ';

        if (item.isDirectory()) {
            output += `${prefix}${connector}📂 **${item.name}**\n`;
            // Check if directory is effectively empty or just has excluded stuff
            const subTree = generateTree(path.join(dir, item.name), prefix + childPrefix);
            if (subTree) {
                output += subTree;
            }
        } else {
            output += `${prefix}${connector}${item.name}\n`;
        }
    });

    return output;
}

const tree = `# Project Source Tree\n\n` +
    `Generated on: ${new Date().toISOString()}\n` +
    `Root: ${rootDir}\n\n` +
    generateTree(rootDir);

fs.writeFileSync(outputFile, tree);
console.log('Tree generated at ' + outputFile);
