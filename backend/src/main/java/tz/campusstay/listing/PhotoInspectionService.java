package tz.campusstay.listing;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import tz.campusstay.exception.BadRequestException;
import tz.campusstay.listing.dto.PhotoInspectionResponse;

@Slf4j
@Service
@RequiredArgsConstructor
public class PhotoInspectionService {

    private static final Set<String> SUPPORTED_ANGLES = Set.of("BEDROOM", "KITCHEN", "BATHROOM", "EXTERIOR", "OTHER");
    private static final Set<String> SUPPORTED_IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final ObjectMapper objectMapper;

    @Value("${app.ai.enabled:true}")
    private boolean aiEnabled;

    @Value("${app.ai.openai-api-key:}")
    private String openAiApiKey;

    @Value("${app.ai.openai-base-url:https://api.openai.com/v1}")
    private String openAiBaseUrl;

    @Value("${app.ai.vision-model:gpt-4.1-mini}")
    private String visionModel;

    @Value("${app.ai.min-confidence:0.65}")
    private BigDecimal minConfidence;

    @Value("${app.ai.max-image-bytes:5242880}")
    private long maxImageBytes;

    public PhotoInspectionResponse inspectPhoto(MultipartFile file, String expectedAngleRaw) {
        String expectedAngle = normalizeAngle(expectedAngleRaw);
        validateFile(file);

        if ("OTHER".equals(expectedAngle)) {
            return new PhotoInspectionResponse(
                    expectedAngle,
                    "OTHER",
                    true,
                    true,
                    1.0,
                    "AI inspection is optional for 'Other' angle.",
                    "local-rule",
                    Instant.now()
            );
        }

        ensureAiConfigured();

        String contentType = resolveSupportedImageType(file);
        byte[] imageBytes;
        try {
            imageBytes = file.getBytes();
        } catch (IOException ex) {
            throw new BadRequestException("Unable to read uploaded image.");
        }

        String base64Image = Base64.getEncoder().encodeToString(imageBytes);
        String dataUrl = "data:" + contentType + ";base64," + base64Image;

        JsonNode resultJson = requestVisionClassification(dataUrl, expectedAngle);

        String detectedCategory = normalizeDetectedCategory(resultJson.path("detected_category").asText(""));
        boolean matchesExpected = resultJson.path("matches_expected").asBoolean(false);
        double confidence = normalizeConfidence(resultJson.path("confidence"));
        String reason = resultJson.path("reason").asText("No reason was returned by AI.");

        boolean passed = matchesExpected && BigDecimal.valueOf(confidence).compareTo(minConfidence) >= 0;

        return new PhotoInspectionResponse(
                expectedAngle,
                detectedCategory,
                matchesExpected,
                passed,
                confidence,
                reason,
                visionModel,
                Instant.now()
        );
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Image file is required for AI inspection.");
        }

        if (file.getSize() > maxImageBytes) {
            long maxMb = Math.max(1, maxImageBytes / (1024 * 1024));
            throw new BadRequestException("Image is too large. Maximum allowed size is " + maxMb + "MB.");
        }
    }

    private void ensureAiConfigured() {
        if (!aiEnabled) {
            throw new BadRequestException("AI inspection is disabled. Set APP_AI_ENABLED=true.");
        }
        if (openAiApiKey == null || openAiApiKey.isBlank()) {
            throw new BadRequestException("AI inspection is not configured. Set OPENAI_API_KEY.");
        }
    }

    private String normalizeAngle(String expectedAngleRaw) {
        String normalized = expectedAngleRaw == null
                ? ""
                : expectedAngleRaw.trim().toUpperCase(Locale.ROOT);
        if (!SUPPORTED_ANGLES.contains(normalized)) {
            throw new BadRequestException("Unsupported expected angle. Use BEDROOM, KITCHEN, BATHROOM, EXTERIOR, or OTHER.");
        }
        return normalized;
    }

    private String resolveSupportedImageType(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null) {
            throw new BadRequestException("Unsupported image format. Use JPG, PNG, or WEBP.");
        }

        String normalized = contentType.trim().toLowerCase(Locale.ROOT);
        if ("image/jpg".equals(normalized)) {
            normalized = "image/jpeg";
        }

        if (!SUPPORTED_IMAGE_TYPES.contains(normalized)) {
            throw new BadRequestException("Unsupported image format. Use JPG, PNG, or WEBP.");
        }

        return normalized;
    }

    private JsonNode requestVisionClassification(String dataUrl, String expectedAngle) {
        Map<String, Object> payload = Map.of(
                "model", visionModel,
                "temperature", 0,
                "response_format", Map.of("type", "json_object"),
                "messages", List.of(
                        Map.of(
                                "role", "system",
                                "content", """
                                        You verify rental listing images. Return strict JSON only.
                                        Decide whether image visibly matches the expected property angle.
                                        Allowed detected_category values: BEDROOM, KITCHEN, BATHROOM, EXTERIOR, OTHER, UNCLEAR.
                                        """
                        ),
                        Map.of(
                                "role", "user",
                                "content", List.of(
                                        Map.of(
                                                "type", "text",
                                                "text", """
                                                        Expected angle: %s
                                                        Return JSON with keys:
                                                        - detected_category: one allowed category
                                                        - matches_expected: boolean
                                                        - confidence: number 0.00 to 1.00
                                                        - reason: short sentence
                                                        Rules:
                                                        - EXTERIOR means outside/building/compound view.
                                                        - If image is blurry/unclear, use UNCLEAR and matches_expected=false.
                                                        """.formatted(expectedAngle)
                                        ),
                                        Map.of(
                                                "type", "image_url",
                                                "image_url", Map.of("url", dataUrl)
                                        )
                                )
                        )
                )
        );

        HttpRequest request;
        try {
            request = HttpRequest.newBuilder()
                    .uri(URI.create(normalizeBaseUrl(openAiBaseUrl) + "/chat/completions"))
                    .timeout(Duration.ofSeconds(45))
                    .header("Authorization", "Bearer " + openAiApiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
                    .build();
        } catch (JsonProcessingException ex) {
            throw new BadRequestException("Failed to prepare AI inspection request.");
        }

        HttpResponse<String> response;
        try {
            response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new BadRequestException("AI inspection was interrupted. Please retry.");
        } catch (IOException ex) {
            throw new BadRequestException("AI inspection service is unreachable. Please retry.");
        }

        if (response.statusCode() >= 300) {
            String errorMessage = extractOpenAiErrorMessage(response.body());
            log.warn("AI inspection request failed: status={}, message={}", response.statusCode(), errorMessage);
            if (response.statusCode() == 401 || response.statusCode() == 403) {
                throw new BadRequestException("AI inspection auth failed. Check OPENAI_API_KEY.");
            }
            if (response.statusCode() == 429) {
                throw new BadRequestException("AI inspection is rate-limited. Please retry in a moment.");
            }
            throw new BadRequestException("AI inspection failed: " + errorMessage);
        }

        JsonNode root;
        try {
            root = objectMapper.readTree(response.body());
        } catch (JsonProcessingException ex) {
            throw new BadRequestException("AI inspection returned invalid response.");
        }

        String content = root.path("choices").path(0).path("message").path("content").asText("");
        if (content.isBlank()) {
            throw new BadRequestException("AI inspection returned empty result.");
        }

        try {
            return objectMapper.readTree(stripCodeFences(content));
        } catch (JsonProcessingException ex) {
            throw new BadRequestException("AI inspection result format was invalid.");
        }
    }

    private String extractOpenAiErrorMessage(String body) {
        if (body == null || body.isBlank()) {
            return "Unexpected upstream error.";
        }

        try {
            JsonNode root = objectMapper.readTree(body);
            String message = root.path("error").path("message").asText("");
            if (!message.isBlank()) {
                return message;
            }
        } catch (JsonProcessingException ignored) {
            // fall through with raw message
        }

        return body.length() > 160 ? body.substring(0, 160) + "..." : body;
    }

    private String normalizeBaseUrl(String baseUrl) {
        String normalized = baseUrl == null ? "" : baseUrl.trim();
        if (normalized.endsWith("/")) {
            return normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    private String stripCodeFences(String content) {
        String trimmed = content.trim();
        if (trimmed.startsWith("```")) {
            int firstLineEnd = trimmed.indexOf('\n');
            if (firstLineEnd > 0) {
                trimmed = trimmed.substring(firstLineEnd + 1);
            }
            int closingFence = trimmed.lastIndexOf("```");
            if (closingFence >= 0) {
                trimmed = trimmed.substring(0, closingFence);
            }
        }
        return trimmed.trim();
    }

    private String normalizeDetectedCategory(String value) {
        String normalized = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        if (normalized.isBlank()) {
            return "UNCLEAR";
        }
        if (SUPPORTED_ANGLES.contains(normalized) || "UNCLEAR".equals(normalized)) {
            return normalized;
        }
        return "OTHER";
    }

    private double normalizeConfidence(JsonNode node) {
        if (node == null || !node.isNumber()) {
            return 0.0;
        }
        BigDecimal confidence = node.decimalValue();
        if (confidence.compareTo(BigDecimal.ZERO) < 0) {
            confidence = BigDecimal.ZERO;
        }
        if (confidence.compareTo(BigDecimal.ONE) > 0) {
            confidence = confidence.divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP);
        }
        if (confidence.compareTo(BigDecimal.ONE) > 0) {
            confidence = BigDecimal.ONE;
        }
        return confidence.setScale(4, RoundingMode.HALF_UP).doubleValue();
    }
}
