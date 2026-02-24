package tz.campusstay.landlord.dto;

import java.time.Instant;
import java.util.UUID;

public record LandlordProfileResponse(
        UUID profileId,
        UUID userId,
        String fullName,
        String email,
        String phone,
        String verificationStatus,
        String identityDocumentPlaceholder,
        String reviewNotes,
        Instant reviewedAt,
        String subscriptionPlan
) {
}
