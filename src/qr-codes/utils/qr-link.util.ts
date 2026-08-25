import { Event } from '../../events/entities/event.entity';

/**
 * Generates the public-facing QR scan URL for a given event and QR code.
 *
 * Design decision: QR links ALWAYS use the UUID v7 hash (urlHash), regardless
 * of the event's urlStrategy setting. This is intentional:
 *   - Slug is mutable (can be changed for branding) → would break printed QR codes
 *   - Numeric ID is exploitable (sequential, guessable) → security risk
 *   - UUID v7 is immutable, cryptographically unique, and time-ordered
 *
 * The urlStrategy only controls the event's public-facing page URL
 * (e.g. what shows in the browser address bar), NOT the QR code link.
 *
 * Fallback (legacy events without urlHash):
 *   Falls back to numeric ID only if urlHash is not yet assigned.
 *   All events created after the UUID v7 migration always have urlHash.
 */
export function generateQrLink(
    eventOrId: Event | number,
    qrId: number,
): string {
    const rawBaseUrl = process.env.BASE_URL || 'http://localhost:5173';
    const baseUrl = rawBaseUrl.replace(/\/+$/, '');

    if (typeof eventOrId === 'number') {
        // Legacy numeric-only form — UUID not available
        return `${baseUrl}/e/${eventOrId}/qr/${qrId}`;
    }

    const event = eventOrId;

    // Always use UUID v7 hash — immutable, secure, permanent identifier
    if (event.urlHash) {
        return `${baseUrl}/e/${event.urlHash}/qr/${qrId}`;
    }

    // Fallback for legacy events created before the UUID v7 migration
    return `${baseUrl}/e/${event.id}/qr/${qrId}`;
}
