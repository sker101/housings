package tz.campusstay.listing.dto;

public record PublicListingPhotoContent(
        byte[] bytes,
        String contentType,
        String fileName
) {
}

