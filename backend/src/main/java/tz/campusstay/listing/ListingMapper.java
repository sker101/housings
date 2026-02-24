package tz.campusstay.listing;

import java.util.List;
import org.springframework.stereotype.Component;
import tz.campusstay.listing.dto.ListingPhotoResponse;
import tz.campusstay.listing.dto.ListingResponse;

@Component
public class ListingMapper {

    public ListingResponse toResponse(Listing listing) {
        return toResponse(listing, List.of());
    }

    public ListingResponse toResponse(Listing listing, List<ListingPhotoResponse> photos) {
        return new ListingResponse(
                listing.getId(),
                listing.getUniversity().getCode(),
                listing.getUniversity().getName(),
                listing.getTitle(),
                listing.getDescription(),
                listing.getAddress(),
                listing.getRentAmount(),
                listing.getCurrency(),
                listing.getBedrooms(),
                listing.getBathrooms(),
                listing.getOccupancyType().name(),
                listing.getListingStatus().name(),
                listing.isVerified(),
                listing.isFeatured(),
                listing.getPromotionLevel().name(),
                listing.isFlagged(),
                listing.getFlaggedReason(),
                listing.getLandlord().getFullName(),
                listing.getLandlord().getId(),
                listing.getCreatedAt(),
                listing.getUpdatedAt(),
                photos == null ? List.of() : List.copyOf(photos)
        );
    }

    public ListingPhotoResponse toPhotoResponse(ListingPhoto photo, String publicUrl) {
        return new ListingPhotoResponse(
                photo.getId(),
                photo.getAngle().name(),
                publicUrl,
                photo.getSortOrder()
        );
    }
}
