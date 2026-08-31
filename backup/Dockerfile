FROM postgres:16-alpine

# Instala rclone, bash e configurações de fuso horário/cron
RUN apk add --no-cache bash rclone gzip tzdata dcron

# Configura o fuso horário para o Brasil
ENV TZ=America/Sao_Paulo

WORKDIR /backup

# Copia os scripts e dá permissão de execução
COPY backup.sh /backup/backup.sh
COPY entrypoint.sh /backup/entrypoint.sh
RUN chmod +x /backup/backup.sh /backup/entrypoint.sh

# Configura a crontab do root (dcron usa o diretório /etc/crontabs)
COPY crontab /etc/crontabs/root

# Usa o entrypoint para salvar variáveis de ambiente antes de iniciar o cron
ENTRYPOINT ["/backup/entrypoint.sh"]
