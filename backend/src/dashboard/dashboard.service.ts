import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  // Análise de um período escolhido pelo usuário (inclui vendas antigas lançadas do caderno).
  // tzOffset = Date.getTimezoneOffset() do navegador, para agrupar os dias no fuso local do usuário.
  async getPeriodMetrics(start: Date, end: Date, tzOffset: number) {
    const where = { createdAt: { gte: start, lte: end }, status: 'COMPLETED' as const };

    const [sales, items] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        select: { total: true, totalCost: true, createdAt: true, paymentMethod: true, isRetroactive: true },
      }),
      this.prisma.saleItem.findMany({
        where: { sale: where },
        select: { productId: true, quantity: true, price: true },
      }),
    ]);

    const revenue = sales.reduce((acc, s) => acc + s.total, 0);
    const cost = sales.reduce((acc, s) => acc + s.totalCost, 0);

    // Data local (AAAA-MM-DD) da venda no fuso do usuário
    const localDate = (d: Date) => new Date(d.getTime() - tzOffset * 60000).toISOString().slice(0, 10);

    // Gráfico: por dia em períodos de até 62 dias, senão por mês
    const days = (end.getTime() - start.getTime()) / 86400000;
    const byMonth = days > 62;
    const chartMap = new Map<string, { key: string; revenue: number; profit: number }>();
    for (const s of sales) {
      const key = byMonth ? localDate(s.createdAt).slice(0, 7) : localDate(s.createdAt);
      const entry = chartMap.get(key) || { key, revenue: 0, profit: 0 };
      entry.revenue += s.total;
      entry.profit += s.total - s.totalCost;
      chartMap.set(key, entry);
    }
    const chartData = Array.from(chartMap.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(e => {
        const [y, m, d] = e.key.split('-');
        return { date: byMonth ? `${m}/${y}` : `${d}/${m}`, revenue: e.revenue, profit: e.profit };
      });

    // Formas de pagamento
    const paymentMap = new Map<string, { method: string; total: number; count: number }>();
    for (const s of sales) {
      const entry = paymentMap.get(s.paymentMethod) || { method: s.paymentMethod, total: 0, count: 0 };
      entry.total += s.total;
      entry.count++;
      paymentMap.set(s.paymentMethod, entry);
    }

    // Produtos mais vendidos no período (quantidade e faturamento bruto dos itens)
    const productMap = new Map<number, { quantity: number; revenue: number }>();
    for (const i of items) {
      const entry = productMap.get(i.productId) || { quantity: 0, revenue: 0 };
      entry.quantity += i.quantity;
      entry.revenue += i.price * i.quantity;
      productMap.set(i.productId, entry);
    }
    const topIds = Array.from(productMap.entries())
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, 10);
    const productsInfo = await this.prisma.product.findMany({
      where: { id: { in: topIds.map(([id]) => id) } },
      select: { id: true, name: true, code: true },
    });
    const topProducts = topIds.map(([id, v]) => {
      const info = productsInfo.find(p => p.id === id);
      return { id, name: info?.name || 'Desconhecido', code: info?.code || '', quantity: v.quantity, revenue: v.revenue };
    });

    return {
      revenue,
      profit: revenue - cost,
      count: sales.length,
      averageTicket: sales.length ? revenue / sales.length : 0,
      retroactiveCount: sales.filter(s => s.isRetroactive).length,
      groupedBy: byMonth ? 'month' : 'day',
      chartData,
      byPayment: Array.from(paymentMap.values()).sort((a, b) => b.total - a.total),
      topProducts,
    };
  }

  async getMetrics() {
    const now = new Date();
    
    // Start of Today
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // Start of 7 Days Ago
    const startOf7Days = new Date(now);
    startOf7Days.setDate(now.getDate() - 6);
    startOf7Days.setHours(0, 0, 0, 0);

    // Start of Month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Aggregate queries for metrics
    const [todayAgg, weekAgg, monthAgg] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { createdAt: { gte: startOfToday }, status: 'COMPLETED' },
        _sum: { total: true, totalCost: true },
        _count: { id: true },
      }),
      this.prisma.sale.aggregate({
        where: { createdAt: { gte: startOf7Days }, status: 'COMPLETED' },
        _sum: { total: true, totalCost: true },
        _count: { id: true },
      }),
      this.prisma.sale.aggregate({
        where: { createdAt: { gte: startOfMonth }, status: 'COMPLETED' },
        _sum: { total: true, totalCost: true },
        _count: { id: true },
      }),
    ]);

    // Top 5 selling products in the last 7 days
    const topProductsRaw = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      where: { sale: { status: 'COMPLETED', createdAt: { gte: startOf7Days } } },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    const topProductsIds = topProductsRaw.map(p => p.productId);
    const topProductsInfo = await this.prisma.product.findMany({
      where: { id: { in: topProductsIds } },
      select: { id: true, name: true, code: true }
    });

    const topProducts = topProductsRaw.map(raw => {
      const pInfo = topProductsInfo.find(p => p.id === raw.productId);
      return {
        id: raw.productId,
        name: pInfo?.name || 'Desconhecido',
        code: pInfo?.code || '',
        quantity: raw._sum.quantity || 0,
      };
    });

    // Chart Data (Last 7 days revenue by day)
    const salesLast7Days = await this.prisma.sale.findMany({
      where: { createdAt: { gte: startOf7Days }, status: 'COMPLETED' },
      select: { total: true, totalCost: true, createdAt: true },
    });

    const chartMap = new Map<string, { date: string, revenue: number, profit: number }>();
    
    // Initialize last 7 days with 0
    for(let i=6; i>=0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      chartMap.set(dateStr, { date: dateStr, revenue: 0, profit: 0 });
    }

    salesLast7Days.forEach(sale => {
      const d = new Date(sale.createdAt);
      const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (chartMap.has(dateStr)) {
        const item = chartMap.get(dateStr)!;
        item.revenue += sale.total;
        item.profit += (sale.total - sale.totalCost);
      }
    });

    const chartData = Array.from(chartMap.values());

    // Low stock alerts
    const lowStockAlerts = await this.prisma.product.findMany({
      where: { stock: { lte: 20 } },
      orderBy: { stock: 'asc' },
      take: 10,
    });

    // Pending Debt
    const debtAgg = await this.prisma.customer.aggregate({
      _sum: { balance: true }
    });

    return {
      today: {
        revenue: todayAgg._sum.total || 0,
        profit: (todayAgg._sum.total || 0) - (todayAgg._sum.totalCost || 0),
        count: todayAgg._count.id
      },
      week: {
        revenue: weekAgg._sum.total || 0,
        profit: (weekAgg._sum.total || 0) - (weekAgg._sum.totalCost || 0),
        count: weekAgg._count.id
      },
      month: {
        revenue: monthAgg._sum.total || 0,
        profit: (monthAgg._sum.total || 0) - (monthAgg._sum.totalCost || 0),
        count: monthAgg._count.id
      },
      debt: debtAgg._sum.balance || 0,
      topProducts,
      chartData,
      lowStockAlerts
    };
  }
}
