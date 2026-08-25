import * as crypto from 'crypto';

/**
 * Generates a full UUID v7 (time-ordered) string.
 *
 * UUID v7 embeds a 48-bit Unix ms timestamp in the high bits, making hashes
 * both unique and chronologically sortable. This is the ONLY hash format used
 * in QR Glam — all events receive a UUID v7 on creation and it never changes.
 *
 * Format: xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx (36 chars)
 * @returns Full UUID v7 string
 */
export function generateUuidV7Hash(): string {
    const ms = BigInt(Date.now());
    const rand = crypto.randomBytes(10);

    const bytes = Buffer.alloc(16);
    bytes[0] = Number((ms >> 40n) & 0xffn);
    bytes[1] = Number((ms >> 32n) & 0xffn);
    bytes[2] = Number((ms >> 24n) & 0xffn);
    bytes[3] = Number((ms >> 16n) & 0xffn);
    bytes[4] = Number((ms >> 8n) & 0xffn);
    bytes[5] = Number(ms & 0xffn);
    bytes[6] = (rand[0] & 0x0f) | 0x70; // version 7
    bytes[7] = rand[1];
    bytes[8] = (rand[2] & 0x3f) | 0x80; // variant
    rand.copy(bytes, 9, 3, 10);

    const hex = bytes.toString('hex');
    // Format as standard UUID: 8-4-4-4-12
    return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20, 32),
    ].join('-');
}
