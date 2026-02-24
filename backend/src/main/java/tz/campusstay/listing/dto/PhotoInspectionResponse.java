package tz.campusstay.listing.dto;

import java.time.Instant;

public record PhotoInspectionResponse(
        String expectedAngle,
        String detectedCategory,
        boolean matchesExpected,
        boolean passed,
        double confidence,
        String reason,
        String model,
        Instant inspectedAt
) {
}
