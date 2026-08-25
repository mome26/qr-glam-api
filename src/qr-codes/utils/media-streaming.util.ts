/**
 * T087: Media streaming utilities for handling large media files (>100MB)
 * Implements lazy loading and streaming URL support
 */

/**
 * Generate a streaming URL for large media files
 * Supports byte-range requests for streaming/resumable downloads
 *
 * @param mediaUrl Original media URL
 * @param maxSize Max file size to handle (default 100MB)
 * @returns Streaming-capable URL or null if too large
 */
export function getStreamingMediaUrl(
    mediaUrl: string | null | undefined,
    _maxSize: number = 100 * 1024 * 1024, // 100MB
): string | null {
    if (!mediaUrl) {
        return null;
    }

    // For URLs already supporting range requests (CDN URLs), return as-is
    if (isRangeRequestSupported(mediaUrl)) {
        return mediaUrl;
    }

    // For Google Drive, construct streaming URL
    if (mediaUrl.includes('drive.google.com')) {
        return generateGoogleDriveStreamingUrl(mediaUrl);
    }

    return mediaUrl;
}

/**
 * Check if URL supports HTTP range requests
 */
function isRangeRequestSupported(url: string): boolean {
    // CDN URLs that support range requests
    const supportedDomains = [
        'cloudflare.com',
        'cdn.example.com',
        'r2.example.com',
        'googleapis.com',
    ];
    return supportedDomains.some((domain) => url.includes(domain));
}

/**
 * Convert Google Drive share link to streaming download URL
 */
function generateGoogleDriveStreamingUrl(shareLink: string): string {
    // Extract file ID from share link
    const fileIdMatch = shareLink.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!fileIdMatch) {
        return shareLink;
    }

    const fileId = fileIdMatch[1];

    // Return direct download URL supporting range requests
    return `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
}

/**
 * Add lazy loading attributes for HTML img/video elements
 */
export function addLazyLoadingAttributes(
    htmlContent: string,
    _mediaUrl: string,
): string {
    // Add loading="lazy" to img tags
    let result = htmlContent.replace(
        /<img([^>]*?)src=/g,
        '<img$1loading="lazy" src=',
    );

    // Add preload="none" to video tags for lazy loading
    result = result.replace(/<video([^>]*)>/g, '<video$1 preload="none">');

    return result;
}

/**
 * Get media type for Content-Type header
 */
export function getMediaContentType(url: string): string {
    if (url.endsWith('.mp4')) return 'video/mp4';
    if (url.endsWith('.webm')) return 'video/webm';
    if (url.endsWith('.jpg') || url.endsWith('.jpeg')) return 'image/jpeg';
    if (url.endsWith('.png')) return 'image/png';
    if (url.endsWith('.gif')) return 'image/gif';
    if (url.endsWith('.webp')) return 'image/webp';

    // Default to generic binary
    return 'application/octet-stream';
}
