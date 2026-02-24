package tz.campusstay.listing;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import tz.campusstay.listing.dto.CreateListingRequest;
import tz.campusstay.listing.dto.ListingPhotoResponse;
import tz.campusstay.listing.dto.ListingResponse;
import tz.campusstay.listing.dto.PhotoInspectionResponse;
import tz.campusstay.listing.dto.UpdateListingRequest;
import tz.campusstay.user.CurrentUserService;

@Validated
@RestController
@RequestMapping("/api/v1/landlord/listings")
@RequiredArgsConstructor
public class LandlordListingController {

    private final ListingService listingService;
    private final PhotoInspectionService photoInspectionService;
    private final CurrentUserService currentUserService;

    @PostMapping
    public ListingResponse create(@Valid @RequestBody CreateListingRequest request) {
        return listingService.createListing(currentUserService.getCurrentUser(), request);
    }

    @PutMapping("/{listingId}")
    public ListingResponse update(@PathVariable UUID listingId, @Valid @RequestBody UpdateListingRequest request) {
        return listingService.updateListing(currentUserService.getCurrentUser(), listingId, request);
    }

    @GetMapping("/mine")
    public Page<ListingResponse> listMine(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int size
    ) {
        return listingService.listMine(currentUserService.getCurrentUser(), page, size);
    }

    @PostMapping(path = "/photos/inspect", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PhotoInspectionResponse inspectPhoto(
            @RequestPart("file") MultipartFile file,
            @RequestParam("expectedAngle") String expectedAngle
    ) {
        return photoInspectionService.inspectPhoto(file, expectedAngle);
    }

    @PostMapping(path = "/{listingId}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ListingPhotoResponse uploadListingPhoto(
            @PathVariable UUID listingId,
            @RequestPart("file") MultipartFile file,
            @RequestParam("angle") String angle
    ) {
        return listingService.uploadListingPhoto(currentUserService.getCurrentUser(), listingId, file, angle);
    }
}
