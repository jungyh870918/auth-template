import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
} from '@nestjs/common';
import { CreateReportDto } from './dtos/create-report.dto';
import { ReportsService } from './reports.service';
import { AuthGuard } from '../guards/auth.guard';
import { CurrentUser } from '../users/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { ReportDto } from './dtos/report.dto';
import { Serialize } from '../interceptors/serialize.interceptor';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Reports') // Swagger UI 카테고리
@ApiBearerAuth()    // JWT 토큰 필요 표시
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) { }

  @Post()
  @UseGuards(AuthGuard)
  @Serialize(ReportDto)
  @ApiOperation({ summary: '리포트 생성', description: '새로운 휴대폰 리포트를 생성합니다.' })
  @ApiResponse({ status: 201, type: ReportDto, description: '생성된 리포트' })
  createReport(@Body() body: CreateReportDto, @CurrentUser() user: User) {
    return this.reportsService.create(body, user);
  }

  @Get('/all')
  @UseGuards(AuthGuard)
  @Serialize(ReportDto)
  @ApiOperation({ summary: '모든 리포트 조회', description: '등록된 모든 휴대폰 리포트를 조회합니다.' })
  @ApiResponse({ status: 200, type: [ReportDto], description: '리포트 목록' })
  getAllReports() {
    return this.reportsService.findAll();
  }
}
