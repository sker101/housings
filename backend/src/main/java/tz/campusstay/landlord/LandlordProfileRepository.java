package tz.campusstay.landlord;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LandlordProfileRepository extends JpaRepository<LandlordProfile, UUID> {

    Optional<LandlordProfile> findByUserId(UUID userId);

    @Query("""
            SELECT lp FROM LandlordProfile lp
            JOIN FETCH lp.user u
            WHERE u.id = :userId
            """)
    Optional<LandlordProfile> findByUserIdWithUser(@Param("userId") UUID userId);

    long countByVerificationStatus(LandlordVerificationStatus status);

    Page<LandlordProfile> findByVerificationStatus(LandlordVerificationStatus status, Pageable pageable);
}
