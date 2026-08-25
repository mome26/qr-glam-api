import { Repository, DataSource, SelectQueryBuilder } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Guest } from '../entities/guest.entity';

@Injectable()
export class GuestRepository extends Repository<Guest> {
    constructor(private dataSource: DataSource) {
        super(Guest, dataSource.createEntityManager());
    }

    /**
     * Find guests excluding Denied status by default
     * @param eventId Event ID to filter by
     * @param includeDenied Include Denied guests in results
     * @returns Promise of Guest array
     */
    async findByEventId(
        eventId: number,
        includeDenied = false,
    ): Promise<Guest[]> {
        let query = super
            .createQueryBuilder('guest')
            .where('guest.eventId = :eventId', { eventId });

        if (!includeDenied) {
            query = query.andWhere('guest.status != :deniedStatus', {
                deniedStatus: 'Denied',
            });
        }

        return query.getMany();
    }

    /**
     * Build a query excluding Denied status by default
     * @param includeDenied If true, includes Denied guests
     * @returns QueryBuilder
     */
    findActiveGuests(includeDenied = false): SelectQueryBuilder<Guest> {
        let query = super.createQueryBuilder('guest');

        if (!includeDenied) {
            query = query.where('guest.status != :deniedStatus', {
                deniedStatus: 'Denied',
            });
        }

        return query;
    }

    /**
     * Explicitly exclude a specific status from query
     */
    excludeStatus(status: string): SelectQueryBuilder<Guest> {
        return super
            .createQueryBuilder('guest')
            .where('guest.status != :status', { status });
    }
}
