import {
    Injectable,
    Logger,
    OnModuleInit,
    NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface TemplateMeta {
    id: string;
    label: string;
    language: string;
    /** True for the first 'en' template in sorted order — the canonical default */
    isDefault: boolean;
    /** Short SHA-256 hash prefix (12 chars) of template content for cache staleness detection */
    contentHash?: string;
}

interface TemplateCacheEntry {
    meta: TemplateMeta;
    content: string;
}

/** Helper: Convert kebab-case or space-separated string to Title Case */
function toTitleCase(str: string): string {
    return str
        .replace(/[-_]/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * T005: TemplateCacheService — discovers and caches all .hbs template files
 * at application startup. Serves from in-memory cache, eliminating per-request
 * disk I/O. Cache refresh requires application restart.
 *
 * Uses the same dev/dist path resolution as main.ts setBaseViewsDir.
 */
@Injectable()
export class TemplateCacheService implements OnModuleInit {
    private readonly logger = new Logger(TemplateCacheService.name);
    private cache = new Map<string, TemplateCacheEntry>();

    onModuleInit() {
        this.populateCache();
    }

    /** Scan templates directory and populate in-memory cache */
    private populateCache(): void {
        const templatesDir = this.resolveTemplatesDir();

        if (!templatesDir) {
            this.logger.warn(
                'Templates directory not found — cache remains empty',
            );
            return;
        }

        const templates: TemplateCacheEntry[] = [];

        this.walkDir(templatesDir, templates);

        // Sort by language then label
        templates.sort((a, b) => {
            if (a.meta.language !== b.meta.language) {
                return a.meta.language.localeCompare(b.meta.language);
            }
            return a.meta.label.localeCompare(b.meta.label);
        });

        // Mark the first 'en' template as the default
        let defaultMarked = false;
        for (const entry of templates) {
            if (!defaultMarked && entry.meta.language === 'en') {
                entry.meta.isDefault = true;
                defaultMarked = true;
            } else {
                entry.meta.isDefault = false;
            }
            this.cache.set(entry.meta.id, entry);
        }

        this.logger.log(
            `TemplateCacheService: loaded ${this.cache.size} templates`,
        );
    }

    /** Resolve templates directory with dev/dist fallback (same as main.ts) */
    private resolveTemplatesDir(): string | null {
        const dir = path.join(__dirname, '..', 'templates');
        const fallback = path.join(__dirname, '..', '..', 'templates');

        if (fs.existsSync(dir)) return dir;
        if (fs.existsSync(fallback)) return fallback;

        // Try one more level up for nested dist structures
        const deepFallback = path.join(
            __dirname,
            '..',
            '..',
            '..',
            'templates',
        );
        if (fs.existsSync(deepFallback)) return deepFallback;

        return null;
    }

    /** Recursively walk directory, collecting .hbs files */
    private walkDir(
        dir: string,
        entries: TemplateCacheEntry[],
        relativePath = '',
    ): void {
        const dirEntries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of dirEntries) {
            const fullPath = path.join(dir, entry.name);
            const relPath = relativePath
                ? path.join(relativePath, entry.name)
                : entry.name;

            if (entry.isDirectory()) {
                this.walkDir(fullPath, entries, relPath);
            } else if (entry.name.endsWith('.hbs')) {
                const meta = this.parseTemplateFile(entry.name, relPath);
                if (meta) {
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    meta.contentHash = crypto
                        .createHash('sha256')
                        .update(content)
                        .digest('hex')
                        .slice(0, 12);
                    entries.push({ meta, content });
                }
            }
        }
    }

    /** Parse filename to extract id, label, language */
    private parseTemplateFile(
        filename: string,
        relativePath: string,
    ): TemplateMeta | null {
        const ext = '.hbs';
        const nameWithoutExt = filename.slice(0, -ext.length);

        let id: string;
        let label: string;
        let language: string;

        // Root-level file: relativePath equals filename (no directory nesting)
        const isRootLevel = relativePath === filename;

        if (isRootLevel) {
            // Root-level file: e.g., qr-scan-page.hbs or qr-scan-page.en.hbs
            const langSuffixMatch = nameWithoutExt.match(/\.([a-z]{2})$/);
            if (langSuffixMatch) {
                // Has language suffix: qr-scan-page.en
                const baseName = nameWithoutExt.slice(0, -3); // strip '.en'
                id = nameWithoutExt;
                language = langSuffixMatch[1];
                label =
                    baseName === 'qr-scan-page'
                        ? 'Default'
                        : toTitleCase(baseName);
            } else {
                // No language suffix: qr-scan-page
                id = nameWithoutExt;
                language = 'en';
                label =
                    nameWithoutExt === 'qr-scan-page'
                        ? 'Default'
                        : toTitleCase(nameWithoutExt);
            }
        } else {
            // Subdirectory file: e.g., vi/art-deco.vi.hbs or en/qr-scan-page.en.hbs
            // Flatten path separators to :: for safe URL usage
            const normalizedRel = relativePath.replace(/\\/g, '/');
            id = normalizedRel.replace(/\//g, '::').slice(0, -ext.length);

            // Extract language from directory name or filename suffix
            const dirName = normalizedRel.split('/')[0];
            const langSuffixMatch = nameWithoutExt.match(/\.([a-z]{2})$/);
            language = langSuffixMatch ? langSuffixMatch[1] : dirName;

            // Derive label: strip language suffix and title-case
            const baseName = nameWithoutExt.replace(/\.([a-z]{2})$/, '');
            label = toTitleCase(baseName);
        }

        return { id, label, language, isDefault: false };
    }

    /** Get all template metadata, sorted by language then label */
    getAll(): TemplateMeta[] {
        return Array.from(this.cache.values()).map((e) => e.meta);
    }

    /** Get raw content by template id. Throws NotFoundException if not found. */
    getById(id: string): string {
        const entry = this.cache.get(id);
        if (!entry) {
            throw new NotFoundException(`Template "${id}" not found`);
        }
        return entry.content;
    }

    /** Get metadata by template id */
    getMeta(id: string): TemplateMeta | undefined {
        return this.cache.get(id)?.meta;
    }

    /** Returns true if cache has any entries (useful for health checks) */
    isPopulated(): boolean {
        return this.cache.size > 0;
    }
}
