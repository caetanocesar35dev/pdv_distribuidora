#!/bin/bash
# NÃO usa "set -e" para que erros no rclone não matem o script/container

# Carrega as variáveis de ambiente salvas pelo entrypoint
# (cron jobs não herdam as variáveis do container)
if [ -f /backup/env.sh ]; then
  source /backup/env.sh
fi

echo "=========================================="
echo "Iniciando rotina de backup em $(date)"
echo "=========================================="

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
FILENAME="backup_${TIMESTAMP}.sql.gz"
FILEPATH="/backup/${FILENAME}"

# 1. Gera o dump do banco usando a string de conexão e já compacta com gzip
echo "Extraindo dump do banco de dados..."
if ! pg_dump "${DATABASE_URL}" | gzip > "${FILEPATH}"; then
  echo "[ERRO] Falha ao gerar o dump do banco em $(date)"
  rm -f "${FILEPATH}"
  exit 0  # exit 0 para não derrubar o container
fi

echo "Dump gerado com sucesso: ${FILENAME}"

# 2. Envia para o Google Drive usando o rclone
echo "Enviando arquivo para o Google Drive..."
if rclone copy "${FILEPATH}" gdrive:BackupsPDV/ --config=/rclone/rclone.conf; then
  echo "Envio para o Google Drive concluído com sucesso!"
else
  echo "[AVISO] Falha ao enviar para o Google Drive. O backup local será mantido."
  echo "[AVISO] Arquivo preservado em: ${FILEPATH}"
  # NÃO remove o arquivo local se o envio falhou
  exit 0
fi

# 3. Limpa o arquivo local temporário (só se o envio deu certo)
echo "Limpando arquivo local..."
rm "${FILEPATH}"

echo "Backup finalizado com sucesso em $(date)!"
