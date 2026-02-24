package tz.campusstay.user;

import java.util.UUID;

public record UserProfileResponse(
        UUID userId,
        String fullName,
        String email,
        String phone,
        String role,
        String accountStatus,
        String landlordVerificationStatus
) {
}
