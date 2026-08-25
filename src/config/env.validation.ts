import { plainToInstance } from 'class-transformer';
import { IsOptional, IsString, IsUrl, validate } from 'class-validator';

class EnvironmentVariables {
    @IsOptional()
    @IsString()
    NODE_ENV?: string = 'development';

    @IsOptional()
    @IsUrl({ require_tld: false })
    BASE_URL?: string = 'http://localhost:3000';

    @IsOptional()
    @IsString()
    DATABASE_URL?: string;
}

export async function validateEnv() {
    const env = plainToInstance(EnvironmentVariables, process.env, {
        enableImplicitConversion: true,
    });

    const errors = await validate(env, {
        skipMissingProperties: true,
    });

    if (errors.length > 0) {
        console.error('DEBUG: Environment process.env current state:', {
            NODE_ENV: process.env.NODE_ENV,
            BASE_URL: process.env.BASE_URL,
        });
        const errorMessages = errors
            .map(
                (err) =>
                    `${err.property}: ${Object.values(err.constraints || {}).join(', ')}`,
            )
            .join('\n');
        throw new Error(`Environment validation failed:\n${errorMessages}`);
    }

    return env;
}
