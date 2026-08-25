import { Injectable, Logger } from '@nestjs/common';
import { CloudProvider } from './cloud-provider.interface';
import { DriveFileInfoDto } from '../dto/drive-file-info.dto';
import { extractFolderId } from '../../utils/extract-folder-id';

/**
 * GoogleDriveProvider - Simple API key authentication for public Drive folders
 * Handles guest media URL resolution from Google Drive folders using file name matching
 */
@Injectable()
export class GoogleDriveProvider implements CloudProvider {
    private readonly logger = new Logger(GoogleDriveProvider.name);

    private static readonly DRIVE_API_BASE =
        'https://www.googleapis.com/drive/v3';

    constructor() {}

    /**
     * Get effective API key (env var only)
     */
    private async getApiKey(): Promise<string | undefined> {
        return process.env.GOOGLE_API_KEY;
    }

    /**
     * Get guest media URL from Google Drive
     *
     * @param eventId Event SQL integer ID
     * @param guest Guest with id/numericId (QR code)
     * @param options Additional options like folderUrl
     * @returns Structured file info or null if provider cannot resolve
     */
    async getGuestMediaUrl(
        eventId: number,
        guest: { id: number; numericId?: string },
        options?: { mediaFolderId?: string },
    ): Promise<DriveFileInfoDto | null> {
        try {
            const apiKey = await this.getApiKey();
            if (!apiKey) {
                this.logger.debug(
                    `GoogleDriveProvider: No API key — skipping for event=${eventId}`,
                );
                return null;
            }

            const folderId = extractFolderId(options?.mediaFolderId);
            if (!folderId) {
                this.logger.debug(
                    `GoogleDriveProvider: No folder ID for event=${eventId}`,
                );
                return null;
            }

            // T001: Search for files with exact name match (numericId.mp4 or numericId.MP4)
            const identifier = guest.numericId || guest.id.toString();
            const query = encodeURIComponent(
                `'${folderId}' in parents and (name = '${identifier}.mp4' or name = '${identifier}.MP4') and trashed = false`,
            );

            const url =
                `${GoogleDriveProvider.DRIVE_API_BASE}/files` +
                `?q=${query}&fields=files(id,name,mimeType,size)&pageSize=1&key=${apiKey}`;

            const driveResponse = await fetch(url, {
                signal: AbortSignal.timeout(5000), // 5-second timeout
            });

            if (!driveResponse.ok) {
                this.logger.warn(
                    `GoogleDriveProvider: Drive API returned ${driveResponse.status} for event=${eventId}`,
                );
                return null;
            }

            const driveData = (await driveResponse.json()) as {
                files: Array<{
                    id: string;
                    name: string;
                    mimeType: string;
                    size?: string;
                }>;
            };

            if (!driveData.files || driveData.files.length === 0) {
                return null;
            }

            const file = driveData.files[0];
            const isVideo = file.mimeType.startsWith('video/');

            // Construct all URL variants
            const downloadUrl = `https://drive.google.com/uc?export=download&id=${file.id}`;
            const embedUrl = isVideo
                ? `https://drive.google.com/file/d/${file.id}/preview`
                : null;
            const streamUrl = isVideo
                ? `https://drive.google.com/uc?export=view&id=${file.id}`
                : null;
            const thumbnailUrl = isVideo
                ? `https://lh3.googleusercontent.com/d/${file.id}`
                : null;

            return {
                fileId: file.id,
                fileName: file.name,
                mimeType: file.mimeType,
                fileSize: file.size ? parseInt(file.size, 10) : null,
                embedUrl,
                streamUrl,
                downloadUrl,
                thumbnailUrl,
            };
        } catch (error) {
            this.logger.error(
                `GoogleDriveProvider error for event=${eventId}:`,
                error,
            );
            return null;
        }
    }

    /**
     * Test connection by listing files in a public folder (if key works)
     */
    async testConnection(): Promise<boolean> {
        try {
            const apiKey = await this.getApiKey();
            if (!apiKey) return false;

            // Use a known public ID or just test if the key is valid (even a 404 for a file is often enough if it's not a 401/403)
            // We'll just call the files API with a generic query
            const url = `${GoogleDriveProvider.DRIVE_API_BASE}/files?pageSize=1&key=${apiKey}`;
            const response = await fetch(url, {
                signal: AbortSignal.timeout(3000),
            });

            // Status 400 with "API key not valid" would mean failure. 200 means success.
            // Even if it returns no files, a 200/404 is usually indicating the key is accepted by the service boundary.
            return response.ok;
        } catch (error) {
            this.logger.error(
                'GoogleDriveProvider connection test failed:',
                error,
            );
            return false;
        }
    }
}
