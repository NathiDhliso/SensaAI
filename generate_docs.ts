import fs from 'fs';
import path from 'path';
import { MICROSOFT_CERTS } from './src/shared/constants/exam-catalogs/microsoft';

const pagesDir = './src/pages';
const componentsDir = './src/components';

function getFiles(dir: string, exts: string[] = ['.tsx', '.ts'], fileList: string[] = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getFiles(fullPath, exts, fileList);
        } else {
            if (exts.includes(path.extname(fullPath))) {
                fileList.push(fullPath.replace(/\\/g, '/'));
            }
        }
    }
    return fileList;
}

const pages = getFiles(pagesDir);
const components = getFiles(componentsDir);

let md = '# Application Architecture & Microsoft Learning Science Nodes\n\n';
md += '> [!NOTE]\n';
md += '> This document provides a comprehensive mapping of all UI pages, components, and the exact Microsoft Learning Science nodes utilized within the application.\n\n';

md += '## 1. Pages\n';
md += 'The following pages were identified in `src/pages`:\n\n';
pages.forEach(p => md += `- \`${p}\`\n`);
md += '\n';

md += '## 2. Components\n';
md += 'The following components and internal modules were identified in `src/components`:\n\n';
components.forEach(c => md += `- \`${c}\`\n`);
md += '\n';

md += '## 3. Microsoft Learning Science Nodes\n';
md += 'The following nodes (Domains and Tasks) represent the exact learning criteria parsed directly from the internal SensaPBL Microsoft exam catalog.\n\n';

MICROSOFT_CERTS.forEach(cert => {
    md += `### ${cert.name} (${cert.code})\n`;
    md += `**Level:** ${cert.level} | **Provider:** ${cert.provider}\n\n`;
    cert.domains.forEach(domain => {
        md += `#### ${domain.name} (Weight: ${domain.weight}%)\n`;
        domain.tasks.forEach(task => {
            md += `- ${task}\n`;
        });
        md += '\n';
    });
    md += '---\n\n';
});

const outPath = 'C:/Users/nathi/.gemini/antigravity/brain/f5174f15-8db4-4366-a655-951f8c79475c/app_architecture.md';
fs.writeFileSync(outPath, md);
console.log('Successfully wrote to ' + outPath);
