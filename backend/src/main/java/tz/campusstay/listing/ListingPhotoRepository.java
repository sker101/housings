package tz.campusstay.listing;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ListingPhotoRepository extends JpaRepository<ListingPhoto, UUID> {

    List<ListingPhoto> findByListingIdOrderBySortOrderAscCreatedAtAsc(UUID listingId);

    Optional<ListingPhoto> findByListingIdAndAngle(UUID listingId, ListingPhotoAngle angle);

    Optional<ListingPhoto> findByIdAndListingId(UUID id, UUID listingId);

    long countByListingId(UUID listingId);
}

