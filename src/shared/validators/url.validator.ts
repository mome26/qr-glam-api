import {
    ValidatorConstraint,
    ValidatorConstraintInterface,
    ValidationArguments,
    registerDecorator,
    ValidationOptions,
} from 'class-validator';

/**
 * Validates that a string is a valid URL with http/https scheme only
 */
@ValidatorConstraint({ name: 'isValidUrl', async: false })
export class IsValidUrlConstraint implements ValidatorConstraintInterface {
    validate(value: any): boolean {
        if (!value || typeof value !== 'string') {
            return false;
        }

        try {
            const url = new URL(value);
            // Only allow http and https schemes
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
            return false;
        }
    }

    defaultMessage(_args: ValidationArguments) {
        return `_args.property must be a valid URL with http or https scheme`;
    }
}

export function IsValidUrl(options?: ValidationOptions) {
    return function (target: any, propertyKey?: string | symbol) {
        registerDecorator({
            target: target.constructor,
            propertyName: propertyKey as string,
            options,
            constraints: [],
            validator: IsValidUrlConstraint,
        });
    };
}
