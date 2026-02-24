package tz.campusstay.listing;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tz.campusstay.exception.BadRequestException;
import tz.campusstay.exception.ForbiddenException;
import tz.campusstay.exception.ResourceNotFoundException;
import tz.campusstay.listing.dto.CreateListingRequest;
import tz.campusstay.listing.dto.ListingPhotoResponse;
import tz.campusstay.listing.dto.ListingResponse;
import tz.campusstay.listing.dto.PublicListingPhotoContent;
import tz.campusstay.listing.dto.UpdateListingRequest;
import tz.campusstay.university.University;
import tz.campusstay.university.UniversityRepository;
import tz.campusstay.user.Role;
import tz.campusstay.user.User;

@Service
@RequiredArgsConstructor
public class ListingService {

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            MediaType.IMAGE_JPEG_VALUE,
            MediaType.IMAGE_PNG_VALUE,
            "image/webp"
    );
    private static final long MAX_PHOTO_BYTES = 5L * 1024 * 1024;
    private static final int MAX_PHOTOS_PER_LISTING = 15;

    private final ListingRepository listingRepository;
    private final ListingPhotoRepository listingPhotoRepository;
    private final UniversityRepository universityRepository;
    private final ListingMapper listingMapper;

    @Transactional
    public ListingResponse createListing(User currentUser, CreateListingRequest request) {
        requireLandlord(currentUser);

        University university = universityRepository.findByCodeIgnoreCase(request.universityCode().trim())
                .orElseThrow(() -> new ResourceNotFoundException("University not found"));

        String normalizedAddress = normalize(request.address());
        String normalizedTitle = normalize(request.title());
        boolean existsDuplicate = listingRepository.existsDuplicateListing(
                university.getCode(),
                normalizedAddress,
                normalizedTitle,
                null
        );
        if (existsDuplicate) {
            throw new BadRequestException("Duplicate listing detected for this address and title");
        }

        Listing listing = new Listing();
        listing.setLandlord(currentUser);
        listing.setUniversity(university);
        listing.setTitle(request.title().trim());
        listing.setDescription(request.description().trim());
        listing.setAddress(request.address().trim());
        listing.setRentAmount(request.rentAmount());
        listing.setBedrooms(request.bedrooms());
        listing.setBathrooms(request.bathrooms());
        listing.setOccupancyType(request.occupancyType());
        listing.setListingStatus(ListingStatus.PENDING_REVIEW);
        listing.setVerified(false);
        listing.syncNormalizedFields();

        Listing saved = listingRepository.save(listing);
        return listingMapper.toResponse(saved);
    }

    @Transactional
    public ListingResponse updateListing(User currentUser, UUID listingId, UpdateListingRequest request) {
        requireLandlord(currentUser);
        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new ResourceNotFoundException("Listing not found"));

        if (!listing.getLandlord().getId().equals(currentUser.getId())) {
            throw new ForbiddenException("You are not allowed to edit this listing");
        }

        String normalizedAddress = normalize(request.address());
        String normalizedTitle = normalize(request.title());
        boolean existsDuplicate = listingRepository.existsDuplicateListing(
                listing.getUniversity().getCode(),
                normalizedAddress,
                normalizedTitle,
                listing.getId()
        );
        if (existsDuplicate) {
            throw new BadRequestException("Duplicate listing detected for this address and title");
        }

        listing.setTitle(request.title().trim());
        listing.setDescription(request.description().trim());
        listing.setAddress(request.address().trim());
        listing.setRentAmount(request.rentAmount());
        listing.setBedrooms(request.bedrooms());
        listing.setBathrooms(request.bathrooms());
        listing.setOccupancyType(request.occupancyType());
        listing.syncNormalizedFields();

        // Any edit triggers re-verification for trust and anti-scam controls.
        listing.setListingStatus(ListingStatus.PENDING_REVIEW);
        listing.setVerified(false);
        listing.setApprovedBy(null);
        listing.setApprovedAt(null);

        Listing saved = listingRepository.save(listing);
        return listingMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public Page<ListingResponse> listMine(User currentUser, int page, int size) {
        requireLandlord(currentUser);
        Pageable pageable = PageRequest.of(page, size);
        return listingRepository.findByLandlordId(currentUser.getId(), pageable)
                .map(listingMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<ListingResponse> searchPublic(String universityCode,
                                              String query,
                                              BigDecimal minRent,
                                              BigDecimal maxRent,
                                              int page,
                                              int size) {
        Pageable pageable = PageRequest.of(page, size);
        return listingRepository.searchPublicApproved(universityCode, query, minRent, maxRent, pageable)
                .map(listingMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public ListingResponse getPublicById(UUID id) {
        Listing listing = listingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Listing not found"));
        assertPublicListingVisible(listing);
        List<ListingPhotoResponse> photos = listingPhotoRepository.findByListingIdOrderBySortOrderAscCreatedAtAsc(id).stream()
                .map(photo -> listingMapper.toPhotoResponse(photo, toPublicPhotoUrl(id, photo.getId())))
                .toList();
        return listingMapper.toResponse(listing, photos);
    }

    @Transactional
    public ListingPhotoResponse uploadListingPhoto(User currentUser,
                                                   UUID listingId,
                                                   MultipartFile file,
                                                   String angleRaw) {
        requireLandlord(currentUser);

        Listing listing = listingRepository.findByIdAndLandlordId(listingId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Listing not found"));

        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Photo file is required");
        }

        if (file.getSize() > MAX_PHOTO_BYTES) {
            throw new BadRequestException("Photo size must be 5 MB or less");
        }

        String contentType = normalizeContentType(file.getContentType());
        if (!ALLOWED_IMAGE_TYPES.contains(contentType)) {
            throw new BadRequestException("Only JPG, PNG, or WEBP photos are allowed");
        }

        ListingPhotoAngle angle = parsePhotoAngle(angleRaw);

        ListingPhoto photo = listingPhotoRepository.findByListingIdAndAngle(listingId, angle)
                .orElseGet(() -> {
                    long currentCount = listingPhotoRepository.countByListingId(listingId);
                    if (currentCount >= MAX_PHOTOS_PER_LISTING) {
                        throw new BadRequestException("Maximum 15 photos per listing");
                    }

                    ListingPhoto created = new ListingPhoto();
                    created.setListing(listing);
                    created.setAngle(angle);
                    created.setSortOrder(angle.sortOrder());
                    return created;
                });

        try {
            photo.setImageData(file.getBytes());
        } catch (IOException ex) {
            throw new BadRequestException("Could not read uploaded photo");
        }

        photo.setFileName(sanitizeFileName(file.getOriginalFilename(), angle, contentType));
        photo.setContentType(contentType);
        photo.setFileSize(file.getSize());

        ListingPhoto saved = listingPhotoRepository.save(photo);
        return listingMapper.toPhotoResponse(saved, toPublicPhotoUrl(listingId, saved.getId()));
    }

    @Transactional(readOnly = true)
    public PublicListingPhotoContent getPublicListingPhoto(UUID listingId, UUID photoId) {
        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new ResourceNotFoundException("Listing not found"));
        assertPublicListingVisible(listing);

        ListingPhoto photo = listingPhotoRepository.findByIdAndListingId(photoId, listingId)
                .orElseThrow(() -> new ResourceNotFoundException("Photo not found"));

        return new PublicListingPhotoContent(photo.getImageData(), photo.getContentType(), photo.getFileName());
    }

    private void requireLandlord(User user) {
        if (user.getRole() != Role.LANDLORD) {
            throw new ForbiddenException("Only landlords can perform this action");
        }
    }

    private String normalize(String value) {
        return value == null ? null : value.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }

    private void assertPublicListingVisible(Listing listing) {
        if (listing.getListingStatus() != ListingStatus.APPROVED || !listing.isVerified() || listing.isFlagged()) {
            throw new ResourceNotFoundException("Listing not found");
        }
    }

    private ListingPhotoAngle parsePhotoAngle(String angleRaw) {
        String normalized = angleRaw == null ? "" : angleRaw.trim().toUpperCase(Locale.ROOT);
        if (normalized.isBlank()) {
            throw new BadRequestException("Photo angle is required");
        }

        try {
            return ListingPhotoAngle.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Unsupported photo angle: " + angleRaw);
        }
    }

    private String sanitizeFileName(String original, ListingPhotoAngle angle, String contentType) {
        String extension = ".jpg";
        if (MediaType.IMAGE_PNG_VALUE.equals(contentType)) {
            extension = ".png";
        } else if ("image/webp".equals(contentType)) {
            extension = ".webp";
        }

        if (original == null || original.isBlank()) {
            return angle.name().toLowerCase(Locale.ROOT) + extension;
        }

        String cleaned = original.replaceAll("[^a-zA-Z0-9._-]", "_");
        return cleaned.length() > 220 ? cleaned.substring(0, 220) : cleaned;
    }

    private String normalizeContentType(String rawContentType) {
        if (rawContentType == null || rawContentType.isBlank()) {
            return "";
        }
        return rawContentType.trim().toLowerCase(Locale.ROOT);
    }

    private String toPublicPhotoUrl(UUID listingId, UUID photoId) {
        return "/api/v1/public/listings/" + listingId + "/photos/" + photoId;
    }
}
