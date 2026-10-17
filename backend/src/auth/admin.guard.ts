import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Permite a rota apenas para administradores ativos. Deve ser usado depois do AuthGuard,
// que coloca o payload do token em request.user. O papel é conferido no banco (e não só no token),
// para valer na hora caso o usuário seja rebaixado ou desativado.
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;

    const user = userId ? await this.prisma.user.findUnique({ where: { id: userId } }) : null;
    if (!user || !user.isActive || user.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas administradores podem realizar esta ação');
    }
    return true;
  }
}
