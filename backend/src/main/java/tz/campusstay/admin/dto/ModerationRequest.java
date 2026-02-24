package tz.campusstay.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ModerationRequest(
        @NotBlank(message = "Reason is required")
        @Size(min = 3, max = 500)
        String reason
) {
}
