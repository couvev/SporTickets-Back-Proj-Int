import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { isURL, isUUID } from 'class-validator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { BlobService } from './blob.service';
import { UploadBlobDto } from './dto/upload-blob.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('blob')
export class BlobController {
  constructor(private readonly blobService: BlobService) {}

  @Roles(Role.ADMIN)
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() { userId }: UploadBlobDto,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }

    const result = await this.blobService.uploadFile(
      file.originalname,
      file.buffer,
      'public',
      userId,
    );
    return { message: 'File uploaded successfully!', ...result };
  }

  @Roles(Role.ADMIN)
  @Get('list/all')
  async listAllFiles() {
    return this.blobService.listFiles();
  }

  @Roles(Role.ADMIN)
  @Get('list/:userId')
  async listFiles(@Param('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('userId should not be empty');
    }

    if (!isUUID(userId)) {
      throw new BadRequestException('userId should be a valid UUID');
    }

    return this.blobService.listUserFiles(userId);
  }

  @Roles(Role.MASTER)
  @Delete()
  async deleteFile(@Query('url') url: string) {
    if (!url) {
      throw new BadRequestException('url should not be empty');
    }

    if (!isURL(url)) {
      throw new BadRequestException('url should be a valid URL');
    }

    return this.blobService.deleteFile(url);
  }

  @Roles(Role.MASTER)
  @Delete('all')
  async deleteAllFiles() {
    return this.blobService.deleteAllFiles();
  }
}
