package tz.campusstay.listing.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ListingResponse(
        UUID id,
        String universityCode,
        String universityName,
        String title,
        String description,
        String address,
        BigDecimal rentAmount,
        String currency,
        Integer bedrooms,
        Integer bathrooms,
        String occupancyType,
        String listingStatus,
        boolean verified,
        boolean featured,
        String promotionLevel,
        boolean flagged,
        String flaggedReason,
        String landlordName,
        UUID landlordId,
        Instant createdAt,
        Instant updatedAt,
        List<ListingPhotoResponse> photos
) {
}
