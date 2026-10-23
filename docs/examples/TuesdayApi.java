import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * HTTP-клиент для взаимодействия Minecraft-плагина с API сайта Tuesday.
 *
 * Каждый запрос подписывается через HMAC-SHA256. Секрет должен совпадать
 * со значением PLUGIN_API_SECRET в настройках сайта.
 *
 * Требуется Java 17 или новее.
 */
public final class TuesdayApi {

    // Адрес сайта без завершающего слэша, например https://tuesday-prime.ru.
    private final String baseUrl;

    // Тот же секрет, который указан в PLUGIN_API_SECRET на стороне сайта.
    private final String secret;

    // Один клиент используется для всех запросов, чтобы повторно использовать
    // соединения.
    private final HttpClient http = HttpClient.newHttpClient();

    public TuesdayApi(String baseUrl, String secret) {
        this.baseUrl = baseUrl;
        this.secret = secret;
    }

    /**
     * Создаёт HMAC-SHA256-подпись запроса.
     *
     * В подпись входят четыре значения в таком порядке:
     * timestamp, HTTP-метод, путь без query-параметров и тело запроса.
     * Между значениями используется перевод строки.
     *
     * Тело нужно передавать в точности в том виде, в котором оно отправляется
     * серверу. Для GET-запроса без тела передаётся пустая строка.
     */
    public static String sign(
            String secret,
            String timestamp,
            String method,
            String path,
            String body) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(
                secret.getBytes(StandardCharsets.UTF_8),
                "HmacSHA256"));

        String payload = timestamp + "\n" + method + "\n" + path + "\n" + body;

        return HexFormat.of().formatHex(
                mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
    }

    /**
     * Отправляет подписанный запрос к API сайта.
     *
     * method передавай в верхнем регистре: GET или POST.
     * path должен начинаться с "/" и не содержать query-параметров.
     * queryString содержит параметры URL вместе с начальным "?", если они есть.
     * Для запросов без тела передавай null в jsonBody.
     *
     * Query-параметры входят в URL, но не в HMAC-подпись.
     */
    public HttpResponse<String> send(
            String method,
            String path,
            String queryString,
            String jsonBody) throws Exception {
        String body = jsonBody == null ? "" : jsonBody;
        String timestamp = Long.toString(System.currentTimeMillis());

        String url = baseUrl
                + path
                + (queryString == null ? "" : queryString);

        HttpRequest.Builder request = HttpRequest
                .newBuilder(URI.create(url))
                .header("Content-Type", "application/json")
                .header("X-Tuesday-Timestamp", timestamp)
                .header(
                        "X-Tuesday-Signature",
                        sign(secret, timestamp, method, path, body));

        if (method.equals("GET")) {
            request.GET();
        } else {
            request.method(
                    method,
                    HttpRequest.BodyPublishers.ofString(
                            body,
                            StandardCharsets.UTF_8));
        }

        return http.send(
                request.build(),
                HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    }

    /**
     * Отправляет события, накопленные игровым плагином.
     *
     * eventsJsonArray должен содержать JSON-массив событий.
     * При сетевой ошибке или ответе 5xx вызывающий код может повторить запрос.
     * Для безопасных повторов API должен обрабатывать события идемпотентно.
     */
    public HttpResponse<String> sendEvents(String eventsJsonArray) throws Exception {
        String body = "{\"events\":" + eventsJsonArray + "}";

        return send(
                "POST",
                "/api/plugin/events",
                null,
                body);
    }

    /**
     * Получает заказы магазина, ожидающие обработки игровым плагином.
     *
     * limit задаёт максимальное число заказов в одном запросе.
     * Сетевые ошибки и HTTP-статусы нужно обрабатывать в вызывающем коде.
     */
    public HttpResponse<String> fetchOrders(int limit) throws Exception {
        return send(
                "GET",
                "/api/plugin/orders",
                "?limit=" + limit,
                null);
    }

    /**
     * Передаёт сайту результат выдачи заказа.
     *
     * Допустимые значения status: "delivered" и "failed".
     * Поле reason можно не передавать, если дополнительное пояснение не нужно.
     */
    public HttpResponse<String> completeOrder(
            long orderId,
            String status,
            String reason) throws Exception {
        String json;

        if (reason == null) {
            json = "{\"status\":\"" + status + "\"}";
        } else {
            json = "{\"status\":\"" + status
                    + "\",\"reason\":\"" + escapeJsonString(reason) + "\"}";
        }

        return send(
                "POST",
                "/api/plugin/orders/" + orderId,
                null,
                json);
    }

    /**
     * Экранирует строку для включения в JSON без сторонних библиотек.
     * Обрабатывает кавычки, обратные слэши и управляющие символы.
     */
    private static String escapeJsonString(String value) {
        StringBuilder escaped = new StringBuilder(value.length() + 16);

        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);

            switch (c) {
                case '"' -> escaped.append("\\\"");
                case '\\' -> escaped.append("\\\\");
                case '\b' -> escaped.append("\\b");
                case '\f' -> escaped.append("\\f");
                case '\n' -> escaped.append("\\n");
                case '\r' -> escaped.append("\\r");
                case '\t' -> escaped.append("\\t");
                default -> {
                    if (c < 0x20) {
                        escaped.append(String.format("\\u%04x", (int) c));
                    } else {
                        escaped.append(c);
                    }
                }
            }
        }

        return escaped.toString();
    }
}