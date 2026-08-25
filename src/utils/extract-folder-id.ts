/**
 * Extract Google Drive folder ID from a full Drive URL or return raw input.
 * @param input Full Google Drive folder URL or raw folder ID
 * @returns Extracted folder ID, or null if input is empty
 */
export function extractFolderId(input: string): string | null {
    if (!input) return null;

    const match = input.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];

    return input.trim() || null;
}
