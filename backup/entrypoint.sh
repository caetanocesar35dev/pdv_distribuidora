#!/bin/bash
# Salva todas as variáveis de ambiente do container em um arquivo
# para que o cron job consiga acessá-las
env | grep -E '^(DATABASE_URL|TZ|PATH)=' | sed 's/^/export /' > /backup/env.sh

# Inicia o cron daemon em primeiro plano
exec crond -f -l 2
