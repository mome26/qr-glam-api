import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StorageSettingsService } from './storage-settings.service';
import { StorageSettings } from './entities/storage-settings.entity';

describe('StorageSettingsService', () => {
    let service: StorageSettingsService;
    const originalEnv = process.env;

    beforeEach(async () => {
        jest.resetModules();
        process.env = { ...originalEnv };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StorageSettingsService,
                {
                    provide: getRepositoryToken(StorageSettings),
                    useValue: {
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<StorageSettingsService>(StorageSettingsService);
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getSettingsStatus', () => {
        it('should return googleApiKeyConfigured: true when GOOGLE_API_KEY is set in env', async () => {
            process.env.GOOGLE_API_KEY = 'test-key';
            const result = await service.getSettingsStatus();
            expect(result.googleApiKeyConfigured).toBe(true);
        });

        it('should return googleApiKeyConfigured: false when GOOGLE_API_KEY is missing from env', async () => {
            delete process.env.GOOGLE_API_KEY;
            const result = await service.getSettingsStatus();
            expect(result.googleApiKeyConfigured).toBe(false);
        });

        it('should return googleApiKeyConfigured: false when GOOGLE_API_KEY is empty in env', async () => {
            process.env.GOOGLE_API_KEY = '';
            const result = await service.getSettingsStatus();
            expect(result.googleApiKeyConfigured).toBe(false);
        });
    });
});
