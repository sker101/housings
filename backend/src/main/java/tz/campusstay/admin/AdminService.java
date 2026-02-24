package tz.campusstay.admin;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tz.campusstay.admin.dto.DashboardMetricsResponse;
import tz.campusstay.exception.ResourceNotFoundException;
import tz.campusstay.landlord.LandlordMapper;
import tz.campusstay.landlord.LandlordProfile;
import tz.campusstay.landlord.LandlordProfileRepository;
import tz.campusstay.landlord.LandlordVerificationStatus;
import tz.campusstay.landlord.dto.LandlordProfileResponse;
import tz.campusstay.listing.Listing;
import tz.campusstay.listing.ListingMapper;
import tz.campusstay.listing.ListingRepository;
import tz.campusstay.listing.ListingStatus;
import tz.campusstay.listing.dto.ListingResponse;
import tz.campusstay.user.AccountStatus;
import tz.campusstay.user.Role;
import tz.campusstay.user.User;
import tz.campusstay.user.UserRepository;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final ListingRepository listingRepository;
    private final LandlordProfileRepository landlordProfileRepository;
    private final ListingMapper listingMapper;
    private final LandlordMapper landlordMapper;

    @Transactional(readOnly = true)
    public DashboardMetricsResponse getDashboardMetrics() {
        long pendingListings = listingRepository.countByListingStatus(ListingStatus.PENDING_REVIEW);
        long pendingLandlords = landlordProfileRepository.countByVerificationStatus(LandlordVerificationStatus.PENDING);

        return new DashboardMetricsResponse(
                userRepository.count(),
                listingRepository.count(),
                pendingListings + pendingLandlords,
                listingRepository.countByVerifiedTrue(),
                listingRepository.countByFlaggedTrue()
        );
    }

    @Transactional(readOnly = true)
    public Page<ListingResponse> getPendingListings(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return listingRepository.findByListingStatus(ListingStatus.PENDING_REVIEW, pageable)
                .map(listingMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<ListingResponse> getFlaggedListings(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return listingRepository.findByFlaggedTrue(pageable)
                .map(listingMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<LandlordProfileResponse> getPendingLandlords(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return landlordProfileRepository.findByVerificationStatus(LandlordVerificationStatus.PENDING, pageable)
                .map(landlordMapper::toResponse);
    }

    @Transactional
    public ListingResponse approveListing(UUID listingId, User adminUser) {
        Listing listing = getListing(listingId);
        listing.setListingStatus(ListingStatus.APPROVED);
        listing.setVerified(true);
        listing.setRejectedReason(null);
        listing.setApprovedBy(adminUser);
        listing.setApprovedAt(Instant.now());
        return listingMapper.toResponse(listingRepository.save(listing));
    }

    @Transactional
    public ListingResponse rejectListing(UUID listingId, String reason, User adminUser) {
        Listing listing = getListing(listingId);
        listing.setListingStatus(ListingStatus.REJECTED);
        listing.setVerified(false);
        listing.setRejectedReason(reason);
        listing.setApprovedBy(adminUser);
        listing.setApprovedAt(Instant.now());
        return listingMapper.toResponse(listingRepository.save(listing));
    }

    @Transactional
    public ListingResponse flagListing(UUID listingId, String reason) {
        Listing listing = getListing(listingId);
        listing.setFlagged(true);
        listing.setFlaggedReason(reason);
        return listingMapper.toResponse(listingRepository.save(listing));
    }

    @Transactional
    public ListingResponse unflagListing(UUID listingId) {
        Listing listing = getListing(listingId);
        listing.setFlagged(false);
        listing.setFlaggedReason(null);
        return listingMapper.toResponse(listingRepository.save(listing));
    }

    @Transactional
    public LandlordProfileResponse approveLandlord(UUID landlordUserId, User adminUser) {
        User landlordUser = getLandlordUser(landlordUserId);
        landlordUser.setAccountStatus(AccountStatus.ACTIVE);
        userRepository.save(landlordUser);

        LandlordProfile profile = getLandlordProfile(landlordUserId);
        profile.setVerificationStatus(LandlordVerificationStatus.APPROVED);
        profile.setReviewedAt(Instant.now());
        profile.setReviewedBy(adminUser);
        profile.setReviewNotes("Approved by admin");
        return landlordMapper.toResponse(landlordProfileRepository.save(profile));
    }

    @Transactional
    public LandlordProfileResponse rejectLandlord(UUID landlordUserId, String reason, User adminUser) {
        LandlordProfile profile = getLandlordProfile(landlordUserId);
        profile.setVerificationStatus(LandlordVerificationStatus.REJECTED);
        profile.setReviewedAt(Instant.now());
        profile.setReviewedBy(adminUser);
        profile.setReviewNotes(reason);
        return landlordMapper.toResponse(landlordProfileRepository.save(profile));
    }

    @Transactional
    public LandlordProfileResponse suspendLandlord(UUID landlordUserId, String reason, User adminUser) {
        User landlordUser = getLandlordUser(landlordUserId);
        landlordUser.setAccountStatus(AccountStatus.SUSPENDED);
        userRepository.save(landlordUser);

        LandlordProfile profile = getLandlordProfile(landlordUserId);
        profile.setVerificationStatus(LandlordVerificationStatus.SUSPENDED);
        profile.setReviewedAt(Instant.now());
        profile.setReviewedBy(adminUser);
        profile.setReviewNotes(reason);
        landlordProfileRepository.save(profile);

        List<Listing> listings = listingRepository.findAllByLandlordId(landlordUserId);
        listings.forEach(listing -> {
            listing.setListingStatus(ListingStatus.SUSPENDED);
            listing.setVerified(false);
        });
        listingRepository.saveAll(listings);

        return landlordMapper.toResponse(profile);
    }

    private Listing getListing(UUID listingId) {
        return listingRepository.findById(listingId)
                .orElseThrow(() -> new ResourceNotFoundException("Listing not found"));
    }

    private User getLandlordUser(UUID landlordUserId) {
        User user = userRepository.findById(landlordUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Landlord not found"));
        if (user.getRole() != Role.LANDLORD) {
            throw new ResourceNotFoundException("Landlord not found");
        }
        return user;
    }

    private LandlordProfile getLandlordProfile(UUID landlordUserId) {
        return landlordProfileRepository.findByUserId(landlordUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Landlord profile not found"));
    }
}
