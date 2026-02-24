package tz.campusstay.landlord;

import org.springframework.stereotype.Component;
import tz.campusstay.landlord.dto.LandlordProfileResponse;

@Component
public class LandlordMapper {

    public LandlordProfileResponse toResponse(LandlordProfile profile) {
        return new LandlordProfileResponse(
                profile.getId(),
                profile.getUser().getId(),
                profile.getUser().getFullName(),
                profile.getUser().getEmail(),
                profile.getUser().getPhone(),
                profile.getVerificationStatus().name(),
                profile.getIdentityDocumentPlaceholder(),
                profile.getReviewNotes(),
                profile.getReviewedAt(),
                profile.getSubscriptionPlan().name()
        );
    }
}
