#!/bin/sh
# Para o container se alguma etapa falhar (evita subir o servidor com o banco desatualizado)
set -e

# Bancos que já tinham as tabelas de vasilhames antes da migration existir
echo "Verificando migration de vasilhames..."
node prisma/resolve-vasilhames.cjs

# Executa as migrations pendentes antes de iniciar o servidor
echo "Aplicando migrations do Prisma..."
npx prisma migrate deploy

# Inicia o servidor
echo "Iniciando o servidor..."
exec npm run start:prod
