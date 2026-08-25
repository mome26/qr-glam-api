import { generateQrLink } from '../qr-link.util';

describe('QrLinkUtil', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('generateQrLink', () => {
        it('should use BASE_URL from environment if available', () => {
            process.env.BASE_URL = 'https://prod-glam.io';
            const result = generateQrLink(123, 456);
            expect(result).toBe('https://prod-glam.io/e/123/qr/456');
        });

        it('should fallback to default localhost in development if BASE_URL is NOT set', () => {
            delete process.env.BASE_URL;
            process.env.NODE_ENV = 'development';
            const result = generateQrLink(1, 2);
            expect(result).toBe('http://localhost:5173/e/1/qr/2');
        });

        it('should handle trailing slash in BASE_URL gracefully', () => {
            process.env.BASE_URL = 'http://api.myapp.com/';
            const result = generateQrLink(10, 20);
            // It depends on implementation - if it's just concat, it might have double slash.
            // But we should ideally prevent it.
            expect(result).toBe('http://api.myapp.com/e/10/qr/20');
        });
    });
});
