/**
 * Global Bionic Reading Effect
 * 
 * This hook applies bionic reading formatting to all text content
 * in the application when enabled in settings.
 */

import { useEffect } from 'react';
import { usePersonalizationStore } from '@/store/personalization-store';

/**
 * Apply bionic reading formatting to a text node
 * Bolds the first half of each word
 */
function applyBionicFormatting(text: string): string {
    return text.split(/(\s+)/).map(word => {
        // Skip whitespace
        if (/^\s+$/.test(word)) return word;

        // Skip very short words
        if (word.length <= 1) return word;

        // Bold first half of word
        const splitPoint = Math.ceil(word.length / 2);
        const boldPart = word.slice(0, splitPoint);
        const normalPart = word.slice(splitPoint);

        return `<b class="bionic">${boldPart}</b>${normalPart}`;
    }).join('');
}

/**
 * Process all text nodes within an element
 */
function processTextNodes(element: Element): void {
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: (node) => {
                // Skip script, style, and already processed elements
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;

                const tagName = parent.tagName.toLowerCase();
                if (['script', 'style', 'code', 'pre', 'input', 'textarea', 'button'].includes(tagName)) {
                    return NodeFilter.FILTER_REJECT;
                }

                // Skip if already has bionic formatting
                if (parent.classList.contains('bionic') || parent.closest('.bionic-processed')) {
                    return NodeFilter.FILTER_REJECT;
                }

                // Skip empty or whitespace-only nodes
                if (!node.textContent?.trim()) {
                    return NodeFilter.FILTER_REJECT;
                }

                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    const textNodes: Text[] = [];
    let currentNode;
    while ((currentNode = walker.nextNode())) {
        textNodes.push(currentNode as Text);
    }

    textNodes.forEach(textNode => {
        const text = textNode.textContent || '';
        if (!text.trim()) return;

        const span = document.createElement('span');
        span.className = 'bionic-processed';
        span.innerHTML = applyBionicFormatting(text);
        textNode.replaceWith(span);
    });
}

/**
 * Remove bionic formatting from an element
 */
function removeBionicFormatting(element: Element): void {
    const processed = element.querySelectorAll('.bionic-processed');
    processed.forEach(el => {
        const text = el.textContent || '';
        el.replaceWith(document.createTextNode(text));
    });
}

/**
 * Hook to apply bionic reading globally
 */
export function useBionicReading(): void {
    const bionicReading = usePersonalizationStore(state => state.bionicReading);

    useEffect(() => {
        const mainContent = document.getElementById('root');
        if (!mainContent) return;

        if (bionicReading) {
            // Use MutationObserver to handle dynamic content
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            processTextNodes(node as Element);
                        }
                    });
                });
            });

            // Process existing content
            processTextNodes(mainContent);

            // Watch for new content
            observer.observe(mainContent, {
                childList: true,
                subtree: true
            });

            return () => {
                observer.disconnect();
                removeBionicFormatting(mainContent);
            };
        } else {
            // Remove bionic formatting when disabled
            removeBionicFormatting(mainContent);
        }
    }, [bionicReading]);
}

export default useBionicReading;
