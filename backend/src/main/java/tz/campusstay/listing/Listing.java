package tz.campusstay.listing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import tz.campusstay.common.BaseEntity;
import tz.campusstay.university.University;
import tz.campusstay.user.User;

@Getter
@Setter
@Entity
@Table(name = "listings", indexes = {
        @Index(name = "idx_listing_status_university", columnList = "listing_status,university_id"),
        @Index(name = "idx_listing_landlord", columnList = "landlord_id"),
        @Index(name = "idx_listing_featured", columnList = "featured")
})
public class Listing extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "landlord_id", nullable = false)
    private User landlord;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "university_id", nullable = false)
    private University university;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String titleNormalized;

    @Column(nullable = false, length = 5000)
    private String description;

    @Column(nullable = false)
    private String address;

    @Column(nullable = false)
    private String addressNormalized;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal rentAmount;

    @Column(nullable = false, length = 10)
    private String currency = "TZS";

    @Column(nullable = false)
    private Integer bedrooms;

    @Column(nullable = false)
    private Integer bathrooms;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OccupancyType occupancyType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ListingStatus listingStatus = ListingStatus.PENDING_REVIEW;

    @Column(nullable = false)
    private boolean verified = false;

    @Column(nullable = false)
    private boolean featured = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PromotionLevel promotionLevel = PromotionLevel.NONE;

    private Instant promotionExpiresAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CommissionTrackingStatus commissionTrackingStatus = CommissionTrackingStatus.NOT_APPLICABLE;

    @Column(precision = 12, scale = 2)
    private BigDecimal commissionAmount;

    @Column(nullable = false)
    private boolean flagged = false;

    @Column(length = 1000)
    private String flaggedReason;

    @Column(length = 1000)
    private String rejectedReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private User approvedBy;

    private Instant approvedAt;

    @PrePersist
    public void normalize() {
        if (title != null) {
            titleNormalized = normalizeValue(title);
        }
        if (address != null) {
            addressNormalized = normalizeValue(address);
        }
        if (currency != null) {
            currency = currency.toUpperCase(Locale.ROOT).trim();
        }
    }

    public void syncNormalizedFields() {
        titleNormalized = normalizeValue(title);
        addressNormalized = normalizeValue(address);
    }

    private String normalizeValue(String value) {
        return value == null ? null : value.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }
}
