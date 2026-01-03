import {
    BedrockRuntimeClient,
    InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

export interface ImageGenerationOptions {
    prompt: string;
    negativePrompt?: string;
    width?: number;
    height?: number;
    cfgScale?: number;
    seed?: number;
}

export async function generateTitanImage(
    client: BedrockRuntimeClient,
    options: ImageGenerationOptions
): Promise<string> {
    const payload = {
        taskType: 'TEXT_IMAGE',
        textToImageParams: {
            text: options.prompt,
            negativeText: options.negativePrompt || 'text, watermark, low quality, blurry, distorted, ugly, bad anatomy',
        },
        imageGenerationConfig: {
            numberOfImages: 1,
            height: options.height || 1024,
            width: options.width || 1024,
            cfgScale: options.cfgScale || 8.0,
            seed: options.seed ?? Math.floor(Math.random() * 2147483647),
        },
    };

    const command = new InvokeModelCommand({
        modelId: 'amazon.titan-image-generator-v1',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
    });

    try {
        const response = await client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));

        if (responseBody.images && responseBody.images.length > 0) {
            // Return the first image as base64 data URI
            return `data:image/png;base64,${responseBody.images[0]}`;
        }

        throw new Error('No images returned from Titan');
    } catch (error) {
        console.error('Titan Image Generation Error:', error);
        throw error;
    }
}
