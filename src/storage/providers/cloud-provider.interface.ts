import { DriveFileInfoDto } from '../dto/drive-file-info.dto';

/**
 * T077: CloudProvider interface for abstracting cloud storage integrations
 * Used for media URL resolution fallback chain
 */
export interface CloudProvider {
    /**
     * Get guest media URL from cloud provider
     * @param eventId Event ID (integer)
     * @param guest Guest data with potential identifiers
     * @returns Promise with structured file info or null if not found/error
     */
    getGuestMediaUrl(
        eventId: number,
        guest: { id: number; numericId?: string },
        options?: { mediaFolderId?: string },
    ): Promise<DriveFileInfoDto | null>;

    /**
     * Test connectivity to cloud provider
     */
    testConnection(): Promise<boolean>;
}
