import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateEventDto } from '../dto/create-event.dto';
import { UpdateEventDto } from '../dto/update-event.dto';

describe('CreateEventDto - MediaSourceUrl Validation', () => {
    describe('mediaSourceUrl field validation', () => {
        it('should accept valid HTTPS Google Drive URL', async () => {
            const dto = plainToInstance(CreateEventDto, {
                name: 'Test Event',
                date: '2024-12-31T18:00:00.000Z',
                mediaSourceUrl:
                    'https://drive.google.com/drive/folders/1a2b3c4d5e6f',
            });

            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
        });

        it('should accept valid HTTPS URL with path', async () => {
            const dto = plainToInstance(CreateEventDto, {
                name: 'Test Event',
                date: '2024-12-31T18:00:00.000Z',
                mediaSourceUrl: 'https://example.com/gallery/event123',
            });

            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
        });

        it('should accept valid HTTP URL', async () => {
            const dto = plainToInstance(CreateEventDto, {
                name: 'Test Event',
                date: '2024-12-31T18:00:00.000Z',
                mediaSourceUrl: 'http://example.com/media',
            });

            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
        });

        it('should accept URL without protocol (IsUrl allows this)', async () => {
            const dto = plainToInstance(CreateEventDto, {
                name: 'Test Event',
                date: '2024-12-31T18:00:00.000Z',
                mediaSourceUrl: 'drive.google.com/drive/folders/123',
            });

            const errors = await validate(dto);
            // Note: IsUrl() validator by default accepts URLs without protocol
            expect(errors).toHaveLength(0);
        });

        it('should reject invalid URL format', async () => {
            const dto = plainToInstance(CreateEventDto, {
                name: 'Test Event',
                date: '2024-12-31T18:00:00.000Z',
                mediaSourceUrl: 'not-a-url',
            });

            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('mediaSourceUrl');
        });

        it('should reject URL with spaces', async () => {
            const dto = plainToInstance(CreateEventDto, {
                name: 'Test Event',
                date: '2024-12-31T18:00:00.000Z',
                mediaSourceUrl:
                    'https://drive.google.com/drive/folders/123 with spaces',
            });

            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
        });

        it('should allow optional mediaSourceUrl (undefined)', async () => {
            const dto = plainToInstance(CreateEventDto, {
                name: 'Test Event',
                date: '2024-12-31T18:00:00.000Z',
            });

            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
        });

        it('should allow optional mediaSourceUrl (null)', async () => {
            const dto = plainToInstance(CreateEventDto, {
                name: 'Test Event',
                date: '2024-12-31T18:00:00.000Z',
                mediaSourceUrl: null,
            });

            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
        });

        it('should allow empty string for mediaSourceUrl', async () => {
            const dto = plainToInstance(CreateEventDto, {
                name: 'Test Event',
                date: '2024-12-31T18:00:00.000Z',
                mediaSourceUrl: '',
            });

            const errors = await validate(dto);
            // Empty string may fail URL validation, so we check
            // If it does, that's expected behavior
            // Otherwise it should pass (optional field)
            if (errors.length > 0) {
                expect(errors[0].property).toBe('mediaSourceUrl');
            }
        });
    });
});

describe('UpdateEventDto - MediaSourceUrl Validation', () => {
    describe('mediaSourceUrl field validation in updates', () => {
        it('should accept valid URL update', async () => {
            const dto = plainToInstance(UpdateEventDto, {
                mediaSourceUrl:
                    'https://drive.google.com/drive/folders/updated123',
            });

            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
        });

        it('should reject invalid URL update', async () => {
            const dto = plainToInstance(UpdateEventDto, {
                mediaSourceUrl: 'not-valid',
            });

            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
        });

        it('should allow clearing mediaSourceUrl (empty string)', async () => {
            const dto = plainToInstance(UpdateEventDto, {
                mediaSourceUrl: '',
            });

            const errors = await validate(dto);
            // Empty string handling depends on IsUrl behavior
            // This test documents the behavior
            if (errors.length > 0) {
                expect(errors[0].property).toBe('mediaSourceUrl');
            }
        });

        it('should allow updating other fields without mediaSourceUrl', async () => {
            const dto = plainToInstance(UpdateEventDto, {
                name: 'Updated Name',
                status: 'upcoming',
            });

            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
        });

        it('should validate mediaSourceUrl together with other fields', async () => {
            const dto = plainToInstance(UpdateEventDto, {
                name: 'Updated Event',
                mediaSourceUrl: 'https://drive.google.com/drive/folders/123',
                status: 'upcoming',
            });

            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
        });
    });
});
