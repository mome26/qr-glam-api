export class DriveFileInfoDto {
    fileId: string;
    fileName: string;
    mimeType: string;
    fileSize: number | null;
    embedUrl: string | null;
    streamUrl: string | null;
    downloadUrl: string;
    thumbnailUrl: string | null;
}
