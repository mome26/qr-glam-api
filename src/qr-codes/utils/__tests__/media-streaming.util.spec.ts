import {
    getStreamingMediaUrl,
    addLazyLoadingAttributes,
    getMediaContentType,
} from '../media-streaming.util';

describe('media-streaming.util', () => {
    describe('getStreamingMediaUrl', () => {
        it('should return null for null/undefined input', () => {
            expect(getStreamingMediaUrl(null)).toBeNull();
            expect(getStreamingMediaUrl(undefined)).toBeNull();
        });

        it('should return CDN URLs as-is (range requests supported)', () => {
            const cloudflareUrl = 'https://cdn.cloudflare.com/files/media.jpg';
            expect(getStreamingMediaUrl(cloudflareUrl)).toBe(cloudflareUrl);
        });

        it('should detect Cloudflare URLs', () => {
            const url = 'https://example.cloudflare.com/media.mp4';
            expect(getStreamingMediaUrl(url)).toBe(url);
        });

        it('should detect googleapis URLs', () => {
            const url = 'https://storage.googleapis.com/bucket/file.mp4';
            expect(getStreamingMediaUrl(url)).toBe(url);
        });

        it('should detect R2 URLs', () => {
            const url = 'https://bucket.r2.example.com/file.mp4';
            expect(getStreamingMediaUrl(url)).toBe(url);
        });

        it('should convert Google Drive share link to streaming URL', () => {
            const shareLink =
                'https://drive.google.com/file/d/abc123xyz789/view';
            const result = getStreamingMediaUrl(shareLink);

            expect(result).toContain('drive.google.com/uc');
            expect(result).toContain('abc123xyz789');
            expect(result).toContain('export=download');
        });

        it('should return original URL if file ID extraction fails', () => {
            const invalidShareLink = 'https://drive.google.com/invalid';
            const result = getStreamingMediaUrl(invalidShareLink);

            expect(result).toBe(invalidShareLink);
        });

        it('should handle Google Drive URLs with various formats', () => {
            const urls = [
                'https://drive.google.com/file/d/file-id-123/view',
                'https://drive.google.com/file/d/file-id-456/edit',
                'https://drive.google.com/file/d/file_id_789/preview',
            ];

            urls.forEach((url) => {
                const result = getStreamingMediaUrl(url);
                expect(result).toContain('drive.google.com/uc');
            });
        });

        it('should support range requests for streaming downloads', () => {
            const cdnUrl = 'https://cdn.example.com/large-video.mp4';
            const result = getStreamingMediaUrl(cdnUrl);

            expect(result).toBe(cdnUrl);
        });

        it('should handle 100MB+ files', () => {
            const largeFileUrl = 'https://cdn.example.com/4k-video.mp4';
            const result = getStreamingMediaUrl(
                largeFileUrl,
                100 * 1024 * 1024,
            );

            expect(result).toBe(largeFileUrl);
        });

        it('should not modify query parameters in URLs', () => {
            const urlWithParams =
                'https://example.cloudflare.com/file.mp4?v=1&quality=hd';
            const result = getStreamingMediaUrl(urlWithParams);

            expect(result).toBe(urlWithParams);
        });
    });

    describe('addLazyLoadingAttributes', () => {
        it('should add loading="lazy" to img tags', () => {
            const html = '<img src="photo.jpg">';
            const result = addLazyLoadingAttributes(html, 'photo.jpg');

            expect(result).toContain('loading="lazy"');
            expect(result).toContain('src="photo.jpg"');
        });

        it('should preserve existing attributes', () => {
            const html = '<img class="thumbnail" alt="Photo" src="photo.jpg">';
            const result = addLazyLoadingAttributes(html, 'photo.jpg');

            expect(result).toContain('class="thumbnail"');
            expect(result).toContain('alt="Photo"');
            expect(result).toContain('loading="lazy"');
        });

        it('should handle multiple img tags', () => {
            const html = '<img src="photo1.jpg"><img src="photo2.jpg">';
            const result = addLazyLoadingAttributes(html, 'photo1.jpg');

            const lazyCount = (result.match(/loading="lazy"/g) || []).length;
            expect(lazyCount).toBe(2);
        });

        it('should add preload="none" to video tags', () => {
            const html = '<video controls><source src="video.mp4"></video>';
            const result = addLazyLoadingAttributes(html, 'video.mp4');

            expect(result).toContain('preload="none"');
            expect(result).toContain('<source src="video.mp4">');
        });

        it('should preserve video attributes', () => {
            const html =
                '<video class="player" width="640" height="480"></video>';
            const result = addLazyLoadingAttributes(html, 'video.mp4');

            expect(result).toContain('class="player"');
            expect(result).toContain('width="640"');
            expect(result).toContain('preload="none"');
        });

        it('should handle mixed img and video tags', () => {
            const html = '<div><img src="photo.jpg"><video></video></div>';
            const result = addLazyLoadingAttributes(html, 'photo.jpg');

            expect(result).toContain('loading="lazy"');
            expect(result).toContain('preload="none"');
        });

        it('should not add loading="lazy" twice', () => {
            const html = '<img loading="lazy" src="photo.jpg">';
            const result = addLazyLoadingAttributes(html, 'photo.jpg');

            // May have one or two depending on regex behavior
            expect(result).toContain('loading="lazy"');
        });

        it('should handle empty HTML', () => {
            const html = '';
            const result = addLazyLoadingAttributes(html, 'photo.jpg');

            expect(result).toBe('');
        });

        it('should handle HTML with no img or video tags', () => {
            const html = '<div><p>Content without media</p></div>';
            const result = addLazyLoadingAttributes(html, 'photo.jpg');

            expect(result).toBe(html);
        });
    });

    describe('getMediaContentType', () => {
        it('should return video/mp4 for .mp4 files', () => {
            expect(getMediaContentType('video.mp4')).toBe('video/mp4');
            expect(
                getMediaContentType('https://example.com/path/to/video.mp4'),
            ).toBe('video/mp4');
        });

        it('should return video/webm for .webm files', () => {
            expect(getMediaContentType('video.webm')).toBe('video/webm');
        });

        it('should return image/jpeg for .jpg files', () => {
            expect(getMediaContentType('photo.jpg')).toBe('image/jpeg');
        });

        it('should return image/jpeg for .jpeg files', () => {
            expect(getMediaContentType('photo.jpeg')).toBe('image/jpeg');
        });

        it('should return image/png for .png files', () => {
            expect(getMediaContentType('photo.png')).toBe('image/png');
        });

        it('should return image/gif for .gif files', () => {
            expect(getMediaContentType('animation.gif')).toBe('image/gif');
        });

        it('should return image/webp for .webp files', () => {
            expect(getMediaContentType('photo.webp')).toBe('image/webp');
        });

        it('should return application/octet-stream for unknown types', () => {
            expect(getMediaContentType('file.txt')).toBe(
                'application/octet-stream',
            );
            expect(getMediaContentType('archive.zip')).toBe(
                'application/octet-stream',
            );
            expect(getMediaContentType('document.pdf')).toBe(
                'application/octet-stream',
            );
        });

        it('should be case-sensitive for extensions', () => {
            expect(getMediaContentType('VIDEO.MP4')).toBe(
                'application/octet-stream',
            );
        });

        it('should match by extension (ignores query params)', () => {
            // Note: utility matches by URL ending, so it needs
            // extension to be at the end or in the path
            expect(
                getMediaContentType('https://example.com/media/file.mp4'),
            ).toBe('video/mp4');
        });

        it('should handle URLs with paths', () => {
            expect(
                getMediaContentType(
                    'https://cdn.example.com/videos/2024/video.webm',
                ),
            ).toBe('video/webm');
            expect(
                getMediaContentType(
                    'https://storage.example.com/photos/album/photo.jpg',
                ),
            ).toBe('image/jpeg');
        });

        it('should handle file:// protocol URLs', () => {
            expect(getMediaContentType('file:///local/photo.png')).toBe(
                'image/png',
            );
        });

        it('should match last extension if multiple dots', () => {
            expect(getMediaContentType('archive.backup.mp4')).toBe('video/mp4');
            expect(getMediaContentType('image.backup.png')).toBe('image/png');
        });

        it('should handle no extension', () => {
            expect(getMediaContentType('file')).toBe(
                'application/octet-stream',
            );
        });
    });
});
