import { Test, TestingModule } from '@nestjs/testing';
import { GoogleDriveProvider } from './google-drive.provider';
import { DriveFileInfoDto } from '../dto/drive-file-info.dto';

/**
 * Tests for GoogleDriveProvider - API Key authentication
 */
describe('GoogleDriveProvider', () => {
    let provider: GoogleDriveProvider;
    const originalEnv = process.env;

    beforeEach(async () => {
        jest.resetModules();
        process.env = { ...originalEnv };
        process.env.GOOGLE_API_KEY = 'test-api-key';

        const module: TestingModule = await Test.createTestingModule({
            providers: [GoogleDriveProvider],
        }).compile();

        provider = module.get<GoogleDriveProvider>(GoogleDriveProvider);

        // Mock global fetch
        (global as any).fetch = jest.fn();
    });

    afterEach(() => {
        process.env = originalEnv;
        jest.restoreAllMocks();
    });

    describe('getGuestMediaUrl', () => {
        it('should return null when no API key is configured', async () => {
            delete process.env.GOOGLE_API_KEY;
            const result = await provider.getGuestMediaUrl(
                1,
                { id: 1, numericId: '1' },
                { mediaFolderId: 'folder123' },
            );
            expect(result).toBeNull();
        });

        it('should return null when no folder ID is provided', async () => {
            const result = await provider.getGuestMediaUrl(1, {
                id: 1,
                numericId: '1',
            });
            expect(result).toBeNull();
        });

        it('should return DriveFileInfo with all URL variants for a video file', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    files: [
                        {
                            id: 'fileId123',
                            name: '1.mp4',
                            mimeType: 'video/mp4',
                            size: 50000000,
                        },
                    ],
                }),
            };
            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            const result = (await provider.getGuestMediaUrl(
                1,
                { id: 1, numericId: '1' },
                {
                    mediaFolderId:
                        'https://drive.google.com/drive/folders/folderId123',
                },
            )) as DriveFileInfoDto;

            expect(result).toBeDefined();
            expect(result.fileId).toBe('fileId123');
            expect(result.mimeType).toBe('video/mp4');
            expect(result.fileName).toBe('1.mp4');
            expect(result.fileSize).toBe(50000000);
            expect(result.embedUrl).toBe(
                'https://drive.google.com/file/d/fileId123/preview',
            );
            expect(result.streamUrl).toBe(
                'https://drive.google.com/uc?export=view&id=fileId123',
            );
            expect(result.downloadUrl).toBe(
                'https://drive.google.com/uc?export=download&id=fileId123',
            );
            expect(result.thumbnailUrl).toBe(
                'https://lh3.googleusercontent.com/d/fileId123',
            );
        });

        it('should return DriveFileInfo with embedUrl/streamUrl/thumbnailUrl as null for an image file', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    files: [
                        {
                            id: 'imgId',
                            name: '1.jpg',
                            mimeType: 'image/jpeg',
                            size: 2000000,
                        },
                    ],
                }),
            };
            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            const result = (await provider.getGuestMediaUrl(
                1,
                { id: 1, numericId: '1' },
                { mediaFolderId: 'folderId123' },
            )) as DriveFileInfoDto;

            expect(result).toBeDefined();
            expect(result.fileId).toBe('imgId');
            expect(result.mimeType).toBe('image/jpeg');
            expect(result.downloadUrl).toBe(
                'https://drive.google.com/uc?export=download&id=imgId',
            );
            expect(result.embedUrl).toBeNull();
            expect(result.streamUrl).toBeNull();
            expect(result.thumbnailUrl).toBeNull();
        });

        it('should return null if no file matches', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({ files: [] }),
            };
            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            const result = await provider.getGuestMediaUrl(
                1,
                { id: 1, numericId: '1' },
                { mediaFolderId: 'folderId123' },
            );
            expect(result).toBeNull();
        });
    });

    describe('testConnection', () => {
        it('should return true if API key works', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
            const result = await provider.testConnection();
            expect(result).toBe(true);
        });

        it('should return false if API key is invalid', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({ ok: false });
            const result = await provider.testConnection();
            expect(result).toBe(false);
        });
    });
});
