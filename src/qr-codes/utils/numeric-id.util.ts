import { EntityManager } from 'typeorm';
import { QrCode } from '../entities/qr-code.entity';

export async function getNextNumericIdForEvent(
    eventId: number,
    manager: EntityManager,
): Promise<number> {
    const result = await manager
        .createQueryBuilder(QrCode, 'qr')
        .where('qr.eventId = :eventId', { eventId })
        .select('MAX(qr.numericId)', 'max')
        .getRawOne();

    return (result?.max ?? 0) + 1;
}
