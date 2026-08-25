import { extractFolderId } from './extract-folder-id';

describe('extractFolderId', () => {
    it('should extract folder ID from full Google Drive URL', () => {
        expect(
            extractFolderId(
                'https://drive.google.com/drive/folders/1AXmDus_1etoItdou_gJZx6LXUnwxoeiS?usp=sharing',
            ),
        ).toBe('1AXmDus_1etoItdou_gJZx6LXUnwxoeiS');
    });

    it('should extract folder ID from URL without query params', () => {
        expect(
            extractFolderId(
                'https://drive.google.com/drive/folders/abc123def456',
            ),
        ).toBe('abc123def456');
    });

    it('should extract folder ID from URL with trailing slash', () => {
        expect(
            extractFolderId('https://drive.google.com/drive/folders/abc123/'),
        ).toBe('abc123');
    });

    it('should return raw input when no /folders/ pattern found', () => {
        expect(extractFolderId('abc123def456')).toBe('abc123def456');
    });

    it('should return null for empty string', () => {
        expect(extractFolderId('')).toBeNull();
    });

    it('should return null for null/undefined input', () => {
        expect(extractFolderId(null as any)).toBeNull();
        expect(extractFolderId(undefined as any)).toBeNull();
    });

    it('should trim whitespace from raw ID', () => {
        expect(extractFolderId('  abc123  ')).toBe('abc123');
    });

    it('should return null for whitespace-only input', () => {
        expect(extractFolderId('   ')).toBeNull();
    });

    it('should handle URL with query params after folder ID', () => {
        expect(
            extractFolderId(
                'https://drive.google.com/drive/folders/FOLDER_ID-123?resourcekey=abc&usp=sharing',
            ),
        ).toBe('FOLDER_ID-123');
    });

    it('should handle malformed URL without protocol', () => {
        expect(extractFolderId('drive.google.com/drive/folders/xyz789')).toBe(
            'xyz789',
        );
    });
});
