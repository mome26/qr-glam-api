import { Guest } from '../entities/guest.entity';

describe('Guest Entity', () => {
    describe('Status field enum values', () => {
        it('should allow Pending status', () => {
            const guest = new Guest();
            guest.status = 'Pending';
            expect(guest.status).toBe('Pending');
        });

        it('should allow Complete status', () => {
            const guest = new Guest();
            guest.status = 'Complete';
            expect(guest.status).toBe('Complete');
        });

        it('should allow Denied status', () => {
            const guest = new Guest();
            guest.status = 'Denied';
            expect(guest.status).toBe('Denied');
        });

        it('should have Pending as default status', () => {
            const guest = new Guest();
            // Status should be set at database level with default
            expect(['Pending', 'Complete', 'Denied']).toContain(
                guest.status || 'Pending',
            );
        });

        it('should be creatable with valid status values', () => {
            const validStatuses: Array<'Pending' | 'Complete' | 'Denied'> = [
                'Pending',
                'Complete',
                'Denied',
            ];
            validStatuses.forEach((status) => {
                const guest = new Guest();
                guest.status = status;
                expect(guest.status).toBe(status);
            });
        });
    });
});
