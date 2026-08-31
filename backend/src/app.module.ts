import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { CashRegisterModule } from './cash-register/cash-register.module';
import { SalesModule } from './sales/sales.module';
import { CustomersModule } from './customers/customers.module';
import { DashboardModule } from './dashboard/dashboard.module';

import { CommandTabsModule } from './command-tabs/command-tabs.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ProductsModule,
    CashRegisterModule,
    SalesModule,
    CustomersModule,
    DashboardModule,

    CommandTabsModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
