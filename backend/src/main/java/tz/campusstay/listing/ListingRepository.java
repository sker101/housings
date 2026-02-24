package tz.campusstay.listing;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ListingRepository extends JpaRepository<Listing, UUID> {

    @Query("""
            SELECT l FROM Listing l
            WHERE l.listingStatus = 'APPROVED'
              AND l.verified = true
              AND l.flagged = false
              AND lower(l.university.code) = lower(:universityCode)
              AND (:query IS NULL OR :query = '' OR lower(l.title) LIKE lower(concat('%', :query, '%'))
                   OR lower(l.address) LIKE lower(concat('%', :query, '%')))
              AND (:minRent IS NULL OR l.rentAmount >= :minRent)
              AND (:maxRent IS NULL OR l.rentAmount <= :maxRent)
            ORDER BY l.featured DESC, l.createdAt DESC
            """)
    Page<Listing> searchPublicApproved(@Param("universityCode") String universityCode,
                                       @Param("query") String query,
                                       @Param("minRent") java.math.BigDecimal minRent,
                                       @Param("maxRent") java.math.BigDecimal maxRent,
                                       Pageable pageable);

    @Query("""
            SELECT COUNT(l) > 0 FROM Listing l
            WHERE lower(l.university.code) = lower(:universityCode)
              AND l.addressNormalized = :addressNormalized
              AND l.titleNormalized = :titleNormalized
              AND (:excludeId IS NULL OR l.id <> :excludeId)
              AND l.listingStatus <> 'REJECTED'
            """)
    boolean existsDuplicateListing(@Param("universityCode") String universityCode,
                                   @Param("addressNormalized") String addressNormalized,
                                   @Param("titleNormalized") String titleNormalized,
                                   @Param("excludeId") UUID excludeId);

    Page<Listing> findByLandlordId(UUID landlordId, Pageable pageable);

    Page<Listing> findByListingStatus(ListingStatus status, Pageable pageable);

    long countByListingStatus(ListingStatus status);

    long countByVerifiedTrue();

    long countByFlaggedTrue();

    Optional<Listing> findByIdAndLandlordId(UUID id, UUID landlordId);

    List<Listing> findAllByLandlordId(UUID landlordId);

    Page<Listing> findByFlaggedTrue(Pageable pageable);
}
