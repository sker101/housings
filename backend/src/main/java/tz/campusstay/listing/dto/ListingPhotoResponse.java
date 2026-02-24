package tz.campusstay.listing.dto;

import java.util.UUID;

public record ListingPhotoResponse(
        UUID id,
        String angle,
        String url,
        Integer sortOrder
) {
}

