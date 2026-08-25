import { Test, TestingModule } from '@nestjs/testing';
import { QrCodesService } from '../qr-codes.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QrCode } from '../entities/qr-code.entity';
import { QrTemplate } from '../entities/qr-template.entity';
import { Event } from '../../events/entities/event.entity';
import { Guest } from '../../guests/entities/guest.entity';
import { DataSource } from 'typeorm';
import { EventsService } from '../../events/events.service';
import { GoogleDriveProvider } from '../../storage/providers/google-drive.provider';
import { getNextNumericIdForEvent } from '../utils/numeric-id.util';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TemplateCacheService } from '../services/template-cache.service';

jest.mock('../utils/numeric-id.util');

describe('QrCodesService.batchGenerate', () => {
    let service: QrCodesService;
    let dataSource: any;
    let manager: any;

    beforeEach(async () => {
        manager = {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
        };

        const queryRunner = {
            connect: jest.fn(),
            startTransaction: jest.fn(),
            commitTransaction: jest.fn(),
            rollbackTransaction: jest.fn(),
            release: jest.fn(),
            manager,
        };

        dataSource = {
            transaction: jest.fn((cb) => cb(manager)),
            createQueryRunner: jest.fn(() => queryRunner),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                QrCodesService,
                {
                    provide: getRepositoryToken(QrCode),
                    useValue: { manager: {} },
                },
                { provide: getRepositoryToken(QrTemplate), useValue: {} },
                { provide: getRepositoryToken(Event), useValue: {} },
                { provide: getRepositoryToken(Guest), useValue: {} },
                { provide: DataSource, useValue: dataSource },
                { provide: EventsService, useValue: {} },
                { provide: GoogleDriveProvider, useValue: {} },
                {
                    provide: TemplateCacheService,
                    useValue: {
                        getAll: jest.fn().mockReturnValue([]),
                        getById: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<QrCodesService>(QrCodesService);
    });

    it('should generate QR codes successfully (US1)', async () => {
        const event = { id: 1, identifier: 'event-1', defaultTemplateId: null };
        manager.findOne.mockResolvedValueOnce(event); // Event find
        (getNextNumericIdForEvent as jest.Mock).mockResolvedValue(10);

        manager.create.mockImplementation((entity, data) => ({
            id: Math.random(),
            ...data,
        }));
        manager.save.mockResolvedValue({});

        const result = await service.batchGenerate(1, { count: 5 });

        expect(result).toEqual({ created: 5, from: 10, to: 14 });
        expect(manager.create).toHaveBeenCalledTimes(10); // 5 guests + 5 qr codes
        expect(manager.save).toHaveBeenCalledTimes(10); // 5 guests + 5 qr codes
    });

    it('should throw NotFoundException if event not found', async () => {
        manager.findOne.mockResolvedValue(null);
        await expect(service.batchGenerate(999, { count: 5 })).rejects.toThrow(
            NotFoundException,
        );
    });

    it('should throw BadRequestException if template not found', async () => {
        manager.findOne.mockResolvedValueOnce({ id: 1 }); // Event
        manager.findOne.mockResolvedValueOnce(null); // Template
        await expect(
            service.batchGenerate(1, { count: 5, templateId: 999 }),
        ).rejects.toThrow(BadRequestException);
    });

    it('should use provided templateId over event default', async () => {
        const event = { id: 1, defaultTemplateId: 10 };
        manager.findOne.mockResolvedValueOnce(event); // Event find
        manager.findOne.mockResolvedValueOnce({ id: 20 }); // Template find

        (getNextNumericIdForEvent as jest.Mock).mockResolvedValue(1);

        manager.create.mockImplementation((entity, data) => data);

        await service.batchGenerate(1, { count: 1, templateId: 20 });

        const qrCodeCalls = manager.create.mock.calls.filter(
            (c: any) => 'templateId' in c[1],
        );
        expect(qrCodeCalls[0][1].templateId).toBe(20);
    });

    it('should start from #1 if no existing QR codes', async () => {
        const event = { id: 1, identifier: 'event-1' };
        manager.findOne.mockResolvedValueOnce(event);
        (getNextNumericIdForEvent as jest.Mock).mockResolvedValue(1);

        manager.create.mockImplementation((entity, data) => data);

        const result = await service.batchGenerate(1, { count: 3 });
        expect(result.from).toBe(1);
        expect(result.to).toBe(3);
    });
});
