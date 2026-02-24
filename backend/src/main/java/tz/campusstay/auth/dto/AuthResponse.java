package tz.campusstay.auth.dto;

import java.util.UUID;

public record AuthResponse(
        String token,
        UUID userId,
        String fullName,
        String email,
        String phone,
        String role,
        String landlordVerificationStatus
) {
}
