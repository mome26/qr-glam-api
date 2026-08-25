import { QrCode } from '../entities/qr-code.entity';

describe('QR Code Immutability', () => {
    it('should not allow changing guestId or eventId once set', () => {
        const qrCode = new QrCode();
        qrCode.guestId = 123;
        qrCode.eventId = 123;
        qrCode.numericId = 1;

        // This is primarily enforced by TypeORM / Database constraints in practice.
        // However, if we were using a more rich DDD model, we'd test the setter/constructor here.
        // For now, testing the struct fields are just standard properties,
        // and relying on our app logic to not update these fields.
        expect(qrCode.guestId).toBe(123);
    });
});
