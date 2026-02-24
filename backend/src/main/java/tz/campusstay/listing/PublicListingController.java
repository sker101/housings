package tz.campusstay.listing;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tz.campusstay.listing.dto.PublicListingPhotoContent;
import tz.campusstay.listing.dto.ListingResponse;

import java.util.concurrent.TimeUnit;

@Validated
@RestController
@RequestMapping("/api/v1/public/listings")
@RequiredArgsConstructor
public class PublicListingController {

    private final ListingService listingService;

    @GetMapping
    public Page<ListingResponse> search(
            @RequestParam(defaultValue = "UDSM") String universityCode,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) BigDecimal minRent,
            @RequestParam(required = false) BigDecimal maxRent,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int size
    ) {
        return listingService.searchPublic(universityCode, query, minRent, maxRent, page, size);
    }

    @GetMapping("/{listingId}")
    public ListingResponse getById(@PathVariable UUID listingId) {
        return listingService.getPublicById(listingId);
    }

    @GetMapping("/{listingId}/photos/{photoId}")
    public ResponseEntity<byte[]> getPhoto(
            @PathVariable UUID listingId,
            @PathVariable UUID photoId
    ) {
        PublicListingPhotoContent photo = listingService.getPublicListingPhoto(listingId, photoId);
        MediaType mediaType = MediaType.parseMediaType(photo.contentType());

        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(1, TimeUnit.DAYS))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + photo.fileName() + "\"")
                .contentType(mediaType)
                .body(photo.bytes());
    }
}
