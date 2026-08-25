import { NotFoundException } from '@nestjs/common';

jest.mock('fs', () => ({
    existsSync: jest.fn(),
    readdirSync: jest.fn(),
    readFileSync: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');

describe('TemplateCacheService', () => {
    // Must import after jest.mock so we get the mocked version
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TemplateCacheService } = require(
        '../services/template-cache.service',
    );

    let service: any;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new TemplateCacheService();
    });

    describe('onModuleInit', () => {
        it('T007a: populates cache when templates directory exists', () => {
            fs.existsSync.mockReturnValue(true);
            fs.readdirSync.mockReturnValue([
                { name: 'qr-scan-page.hbs', isDirectory: () => false },
            ]);
            fs.readFileSync.mockReturnValue('<html>Default</html>');

            service.onModuleInit();

            const all = service.getAll();
            expect(all.length).toBe(1);
            expect(all[0].id).toBe('qr-scan-page');
            expect(all[0].language).toBe('en');
            expect(all[0].label).toBe('Default');
            expect(all[0].isDefault).toBe(true);
            expect(service.isPopulated()).toBe(true);
        });

        it('T007b: handles missing templates directory gracefully', () => {
            fs.existsSync.mockReturnValue(false);

            service.onModuleInit();

            expect(service.getAll()).toEqual([]);
            expect(service.isPopulated()).toBe(false);
        });

        it('T007c: discovers templates in subdirectories with :: id format', () => {
            fs.existsSync.mockReturnValue(true);
            // First call: root dir returns 'vi' subdirectory
            // Second call: 'vi' subdir returns 'art-deco.vi.hbs'
            fs.readdirSync
                .mockReturnValueOnce([
                    { name: 'vi', isDirectory: () => true },
                ])
                .mockReturnValueOnce([
                    { name: 'art-deco.vi.hbs', isDirectory: () => false },
                ]);
            fs.readFileSync.mockReturnValue('<html>Art Deco VI</html>');

            service.onModuleInit();

            const all = service.getAll();
            expect(all.length).toBe(1);
            expect(all[0].id).toBe('vi::art-deco.vi');
            expect(all[0].language).toBe('vi');
            expect(all[0].label).toBe('Art Deco');
            expect(all[0].isDefault).toBe(false);
        });

        it('T007d: sorts templates by language then label', () => {
            fs.existsSync.mockReturnValue(true);
            fs.readdirSync.mockReturnValue([
                { name: 'art-deco.vi.hbs', isDirectory: () => false },
                { name: 'qr-scan-page.en.hbs', isDirectory: () => false },
            ]);
            fs.readFileSync
                .mockReturnValueOnce('<html>VI</html>')
                .mockReturnValueOnce('<html>EN</html>');

            service.onModuleInit();

            const all = service.getAll();
            expect(all.length).toBe(2);
            // en comes before vi
            expect(all[0].language).toBe('en');
            expect(all[0].isDefault).toBe(true);
            expect(all[1].language).toBe('vi');
            expect(all[1].isDefault).toBe(false);
        });
    });

    describe('getById', () => {
        it('T007e: throws NotFoundException for unknown template id', () => {
            fs.existsSync.mockReturnValue(false);
            service.onModuleInit();

            expect(() => service.getById('nonexistent-template')).toThrow(
                NotFoundException,
            );
            expect(() => service.getById('nonexistent-template')).toThrow(
                'Template "nonexistent-template" not found',
            );
        });
    });

    describe('getMeta', () => {
        it('T007f: returns undefined for unknown template id', () => {
            fs.existsSync.mockReturnValue(false);
            service.onModuleInit();
            const result = service.getMeta('nonexistent');
            expect(result).toBeUndefined();
        });
    });

    describe('isPopulated', () => {
        it('T007g: returns false when cache is empty', () => {
            fs.existsSync.mockReturnValue(false);
            service.onModuleInit();
            expect(service.isPopulated()).toBe(false);
        });

        it('T007h: returns true after successful cache population', () => {
            fs.existsSync.mockReturnValue(true);
            fs.readdirSync.mockReturnValue([
                { name: 'qr-scan-page.hbs', isDirectory: () => false },
            ]);
            fs.readFileSync.mockReturnValue('<html>Default</html>');

            service.onModuleInit();

            expect(service.isPopulated()).toBe(true);
        });
    });
});
