import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../auth/admin.guard';

@UseGuards(AuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  getMetrics() {
    return this.dashboardService.getMetrics();
  }

  // Análise por período: start/end em ISO (já no fuso do navegador) e tz = getTimezoneOffset()
  @UseGuards(AdminGuard)
  @Get('period')
  getPeriodMetrics(@Query('start') start: string, @Query('end') end: string, @Query('tz') tz?: string) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (!start || !end || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Informe um período válido.');
    }
    if (startDate > endDate) {
      throw new BadRequestException('A data inicial não pode ser depois da data final.');
    }
    return this.dashboardService.getPeriodMetrics(startDate, endDate, Number(tz) || 0);
  }
}
