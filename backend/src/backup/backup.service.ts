import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as nodemailer from 'nodemailer';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  // Executa todos os dias às 03:00. Pode mudar para CronExpression.EVERY_MINUTE para testar.
  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleCron() {
    this.logger.log('Iniciando rotina de backup diário (Nodemailer)...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-${timestamp}.sql`;
    const filePath = path.resolve(__dirname, '../../', fileName);

    try {
      await this.generateDatabaseDump(filePath);
      await this.sendBackupEmail(filePath, fileName);
      this.cleanupLocalFile(filePath);
      this.logger.log('Rotina de backup finalizada com sucesso!');
    } catch (error) {
      this.logger.error('Erro na rotina de backup:', error);
    }
  }

  private async generateDatabaseDump(filePath: string) {
    this.logger.log(`Gerando dump do banco em: ${filePath}`);
    const dbUrl = process.env.DATABASE_URL;

    if (!dbUrl) {
      throw new Error('DATABASE_URL não configurada.');
    }

    // Limpa a URL removendo os parametros de schema para não quebrar o pg_dump
    const cleanDbUrl = dbUrl.split('?')[0];
    const command = `pg_dump "${cleanDbUrl}" -F c -f "${filePath}"`;

    try {
      await execAsync(command);
      this.logger.log('Dump gerado com sucesso.');
    } catch (e) {
      this.logger.error(`Falha ao rodar pg_dump: ${e.message}`);
      throw e;
    }
  }

  private async sendBackupEmail(filePath: string, fileName: string) {
    this.logger.log('Enviando backup por e-mail...');

    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    const to = process.env.EMAIL_TO || user;

    if (!user || !pass) {
      throw new Error('EMAIL_USER ou EMAIL_PASS não estão configurados no .env');
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: user,
        pass: pass,
      },
    });

    const mailOptions = {
      from: user,
      to: to,
      subject: `Backup Automático PDV Distribuidora - ${new Date().toLocaleDateString('pt-BR')}`,
      text: 'Olá! Segue em anexo o backup diário do banco de dados do sistema.\n\nEste é um e-mail automático.',
      attachments: [
        {
          filename: fileName,
          path: filePath,
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    this.logger.log(`E-mail enviado com sucesso para ${to}!`);
  }

  private cleanupLocalFile(filePath: string) {
    this.logger.log(`Removendo arquivo de backup local temporário: ${filePath}`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      this.logger.log('Arquivo removido.');
    }
  }
}
