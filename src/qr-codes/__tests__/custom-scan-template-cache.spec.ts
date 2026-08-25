import * as handlebars from 'handlebars';
import { QrCodesService } from '../qr-codes.service';

/**
 * T010: Template cache behavior for getCompiledTemplate()
 *
 * Tests that the in-memory Map<number, { template, compiledFn }> cache:
 * - Returns the same compiled function for identical eventId + templateString
 * - Recompiles when the template string changes for the same eventId
 * - Maintains separate entries for different eventIds
 */
describe('Custom Scan Template Cache (T010)', () => {
    let service: QrCodesService;

    beforeEach(() => {
        // Instantiate service with minimal mocks — getCompiledTemplate is a pure
        // in-memory function that only needs the service instance and its cache.
        service = Object.create(QrCodesService.prototype);
        // Initialize the private templateCache map
        (service as any).templateCache = new Map<
            number,
            { template: string; compiledFn: handlebars.TemplateDelegate }
        >();
        // Bind the method so it can access `this.templateCache`
        service.getCompiledTemplate =
            QrCodesService.prototype.getCompiledTemplate.bind(service);
    });

    it('should return the same compiled function on cache hit (same eventId + template)', () => {
        const template = '<p>Hello {{name}}</p>';

        const fn1 = service.getCompiledTemplate(1, template);
        const fn2 = service.getCompiledTemplate(1, template);

        // Same reference — cache hit
        expect(fn1).toBe(fn2);
        // Verify the function works
        expect(fn1({ name: 'Alice' })).toBe('<p>Hello Alice</p>');
    });

    it('should recompile when template string changes for same eventId', () => {
        const templateA = '<p>Template A: {{name}}</p>';
        const templateB = '<p>Template B: {{name}}</p>';

        const fnA = service.getCompiledTemplate(1, templateA);
        const fnB = service.getCompiledTemplate(1, templateB);

        // Different reference — cache miss due to template change
        expect(fnA).not.toBe(fnB);
        // Verify both compile correctly
        expect(fnA({ name: 'Test' })).toBe('<p>Template A: Test</p>');
        expect(fnB({ name: 'Test' })).toBe('<p>Template B: Test</p>');
    });

    it('should maintain separate cache entries for different eventIds', () => {
        const template = '<p>Hello {{name}}</p>';

        const fn1 = service.getCompiledTemplate(1, template);
        const fn2 = service.getCompiledTemplate(2, template);

        // Both should work correctly
        expect(fn1({ name: 'Alice' })).toBe('<p>Hello Alice</p>');
        expect(fn2({ name: 'Alice' })).toBe('<p>Hello Alice</p>');

        // Different cache entries — different references
        expect(fn1).not.toBe(fn2);

        // Verify cache for event 1 is not affected by event 2
        const fn1Again = service.getCompiledTemplate(1, template);
        expect(fn1Again).toBe(fn1);
    });
});
