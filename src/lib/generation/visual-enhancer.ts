import type { BedrockConfig } from './claude-client';
import { getBedrockClient } from './claude-client';
import { generateTitanImage } from './image-generator';
import { parseGeneratedContent } from '@/lib/content-adapter';

export async function enhanceWithVisuals(
    content: string,
    config: BedrockConfig,
    onStatus: (msg: string) => void
): Promise<string> {
    const parsed = parseGeneratedContent(content);
    if (!parsed.success) {
        console.error('Failed to parse content for visual enhancement', parsed.error);
        return content;
    }

    const client = await getBedrockClient(config);
    let enhancedContent = content;

    // Filter for Foundation concepts that have an anchor but NO image yet
    const foundationConcepts = parsed.data.concepts.filter(
        c => c.mnemonic?.tier === 'Foundation' &&
            c.mnemonic.anchor &&
            !c.mnemonic.imageUrl
    );

    console.log(`Found ${foundationConcepts.length} Foundation concepts for visualization`);

    for (const concept of foundationConcepts) {
        if (!concept.mnemonic) continue;

        // Safety check: ensure we can find the insertion point before generating
        // Also try searching with whitespace variations if needed, but strict string matches usually work if we generated it
        // A safer way is to find the concept block

        // Generate Image
        onStatus(`Painting ${concept.mnemonic.anchor} for ${concept.name}...`);

        try {
            // Prompt Engineering for Titan
            // We want distinct, surreal, memorable images
            const prompt = `Digital art, surrealist style. ${concept.mnemonic.story}. 
      Central object: ${concept.mnemonic.anchor}. 
      High contrast, vivid colors, dreamlike quality. 
      No text, no words, no labels.`;

            const imageUrl = await generateTitanImage(client, {
                prompt,
                negativePrompt: "text, words, labels, watermark, blurry, low quality, distorted face, bad anatomy",
                cfgScale: 8.0,
                seed: Math.floor(Math.random() * 1000000)
            });

            // Inject into Markdown
            // We look for the JSON anchor line and inject the imageUrl line before it
            // Using regex to be whitespace agnostic for the anchor key
            // This regex looks for "anchor" : "The Anchor Value" handling spaces
            const sourceAnchor = escapeRegExp(concept.mnemonic.anchor);
            const anchorRegex = new RegExp(`"anchor"\\s*:\\s*"${sourceAnchor}"`);

            if (enhancedContent.match(anchorRegex)) {
                const replacement = `"imageUrl": "${imageUrl}",\n    "anchor": "${concept.mnemonic.anchor}"`;
                enhancedContent = enhancedContent.replace(anchorRegex, replacement);
                console.log(`Successfully injected image for ${concept.name}`);
            } else {
                console.warn(`Could not find anchor string for ${concept.name} to inject image. searched for regex:`, anchorRegex);
                console.log('Partial content preview:', enhancedContent.substring(0, 500));
            }

        } catch (error) {
            console.error(`Failed to generate image for ${concept.name}:`, error);
            // Continue to next concept, don't fail the whole batch
        }
    }

    return enhancedContent;
}

function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
