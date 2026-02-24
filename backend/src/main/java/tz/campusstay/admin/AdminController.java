package tz.campusstay.admin;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tz.campusstay.admin.dto.DashboardMetricsResponse;
import tz.campusstay.admin.dto.ModerationRequest;
import tz.campusstay.landlord.dto.LandlordProfileResponse;
import tz.campusstay.listing.dto.ListingResponse;
import tz.campusstay.user.CurrentUserService;

@Validated
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final CurrentUserService currentUserService;

    @GetMapping("/dashboard/metrics")
    public DashboardMetricsResponse metrics() {
        return adminService.getDashboardMetrics();
    }

    @GetMapping("/listings/pending")
    public Page<ListingResponse> pendingListings(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int size
    ) {
        return adminService.getPendingListings(page, size);
    }

    @GetMapping("/listings/flagged")
    public Page<ListingResponse> flaggedListings(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int size
    ) {
        return adminService.getFlaggedListings(page, size);
    }

    @PostMapping("/listings/{listingId}/approve")
    public ListingResponse approveListing(@PathVariable UUID listingId) {
        return adminService.approveListing(listingId, currentUserService.getCurrentUser());
    }

    @PostMapping("/listings/{listingId}/reject")
    public ListingResponse rejectListing(@PathVariable UUID listingId,
                                         @Valid @RequestBody ModerationRequest request) {
        return adminService.rejectListing(listingId, request.reason(), currentUserService.getCurrentUser());
    }

    @PostMapping("/listings/{listingId}/flag")
    public ListingResponse flagListing(@PathVariable UUID listingId,
                                       @Valid @RequestBody ModerationRequest request) {
        return adminService.flagListing(listingId, request.reason());
    }

    @PostMapping("/listings/{listingId}/unflag")
    public ListingResponse unflagListing(@PathVariable UUID listingId) {
        return adminService.unflagListing(listingId);
    }

    @GetMapping("/landlords/pending")
    public Page<LandlordProfileResponse> pendingLandlords(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int size
    ) {
        return adminService.getPendingLandlords(page, size);
    }

    @PostMapping("/landlords/{landlordUserId}/approve")
    public LandlordProfileResponse approveLandlord(@PathVariable UUID landlordUserId) {
        return adminService.approveLandlord(landlordUserId, currentUserService.getCurrentUser());
    }

    @PostMapping("/landlords/{landlordUserId}/reject")
    public LandlordProfileResponse rejectLandlord(@PathVariable UUID landlordUserId,
                                                  @Valid @RequestBody ModerationRequest request) {
        return adminService.rejectLandlord(landlordUserId, request.reason(), currentUserService.getCurrentUser());
    }

    @PostMapping("/landlords/{landlordUserId}/suspend")
    public LandlordProfileResponse suspendLandlord(@PathVariable UUID landlordUserId,
                                                   @Valid @RequestBody ModerationRequest request) {
        return adminService.suspendLandlord(landlordUserId, request.reason(), currentUserService.getCurrentUser());
    }
}
