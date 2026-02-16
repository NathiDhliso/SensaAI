
const fs = require('fs');
const path = require('path');

const transformerPath = path.join('src', 'features', 'content-generation', 'parsers', 'transformer.ts');
const parserPath = path.join('src', 'features', 'content-generation', 'parsers', 'json-parser.ts');

function fixTransformer() {
    let content = fs.readFileSync(transformerPath, 'utf8');
    const regex = /if\s*\(concept\.tier\)\s*\{\s*return\s*concept\.tier;\s*\}/;

    if (regex.test(content)) {
        const replacement = `if (concept.tier) {
        const t = concept.tier.toLowerCase();
        if (t === 'trunk' || t === 'branch' || t === 'leaf') return t as 'trunk' | 'branch' | 'leaf';
        return 'leaf';
    }`;
        content = content.replace(regex, replacement);
        fs.writeFileSync(transformerPath, content, 'utf8');
        console.log('Fixed transformer.ts');
    } else {
        console.log('Transformer.ts pattern not found');
    }
}

function fixJsonParser() {
    let content = fs.readFileSync(parserPath, 'utf8');
    // Match the exact block for tier extraction
    // } else if (typeof c.tier === 'string') {
    //    const t = c.tier.toLowerCase();

    const regex = /\}\s*else\s*if\s*\(\s*typeof\s*c\.tier\s*===\s*'string'\s*\)\s*\{\s*const\s*t\s*=\s*c\.tier\.toLowerCase\(\);/;

    if (regex.test(content)) {
        const replacement = `} else if (typeof c.tier === 'string' || typeof c.Tier === 'string') {
        const rawTier = (typeof c.tier === 'string' ? c.tier : c.Tier) as string;
        const t = rawTier.toLowerCase();`;

        content = content.replace(regex, replacement);
        fs.writeFileSync(parserPath, content, 'utf8');
        console.log('Fixed json-parser.ts');
    } else {
        console.log('json-parser.ts pattern not found');
    }
}

fixTransformer();
fixJsonParser();
