#!/usr/bin/env bash
set -euo pipefail

# Отправка подписанного тестового события в API Tuesday.
#
# 1. Укажи PLUGIN_API_SECRET из .env.local.
# 2. При необходимости задай адрес сайта через SITE.
# 3. Запусти скрипт.
#
# Пример для локальной разработки:
# SITE="http://localhost:3000" \
# SECRET="секрет_из_PLUGIN_API_SECRET" \
# ./send-event.sh
#
# Чтобы отправить другое событие, передай JSON через BODY:
# BODY='{"events":[{"type":"presence","uuid":"069a79f4-44e9-4726-a5be-fca90e38aaf5","name":"TestPlayerA","online":true}]}' \
# ./send-event.sh

# По умолчанию запрос отправляется на локальный сайт.
SITE="${SITE:-http://localhost:3000}"

# Без секрета сервер не сможет проверить HMAC-подпись.
: "${SECRET:?Укажи SECRET со значением PLUGIN_API_SECRET из .env.local}"

# Подписывается путь без домена и query-параметров.
REQUEST_PATH="/api/plugin/events"

# Это событие отправляется, если переменная BODY не задана.
DEFAULT_BODY='{"events":[{"type":"achievement","uuid":"069a79f4-44e9-4726-a5be-fca90e38aaf5","name":"TestPlayerA","achievementId":"example-achievement","difficulty":"easy"}]}'

# Можно передать собственный JSON через переменную окружения BODY.
BODY="${BODY:-$DEFAULT_BODY}"

# API ожидает Unix timestamp в миллисекундах.
TS=$(($(date +%s) * 1000))

# Формат подписи должен совпадать с Java-реализацией:
# timestamp + перевод строки + HTTP-метод + перевод строки +
# путь + перевод строки + тело запроса.
#
# В конце тела не должно быть дополнительного перевода строки,
# поэтому для передачи данных в openssl используем printf '%s'.
PAYLOAD="${TS}"$'\n'"POST"$'\n'"${REQUEST_PATH}"$'\n'"${BODY}"

SIG=$(
  printf '%s' "$PAYLOAD" |
    openssl dgst -sha256 -hmac "$SECRET" -hex |
    awk '{print $NF}'
)

# Отправляем тело в том же виде, в котором оно участвовало в подписи.
curl -sS -X POST "${SITE}${REQUEST_PATH}" \
  -H "Content-Type: application/json" \
  -H "X-Tuesday-Timestamp: ${TS}" \
  -H "X-Tuesday-Signature: ${SIG}" \
  --data "$BODY"

echo