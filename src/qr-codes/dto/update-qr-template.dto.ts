import { PartialType } from '@nestjs/mapped-types';
import { CreateQrTemplateDto } from './create-qr-template.dto';

export class UpdateQrTemplateDto extends PartialType(CreateQrTemplateDto) {}
