package tz.campusstay.config;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import tz.campusstay.landlord.LandlordProfile;
import tz.campusstay.landlord.LandlordProfileRepository;
import tz.campusstay.landlord.LandlordVerificationStatus;
import tz.campusstay.listing.Listing;
import tz.campusstay.listing.ListingRepository;
import tz.campusstay.listing.ListingStatus;
import tz.campusstay.listing.OccupancyType;
import tz.campusstay.university.University;
import tz.campusstay.university.UniversityRepository;
import tz.campusstay.user.Role;
import tz.campusstay.user.User;
import tz.campusstay.user.UserRepository;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UniversityRepository universityRepository;
    private final UserRepository userRepository;
    private final LandlordProfileRepository landlordProfileRepository;
    private final ListingRepository listingRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap.admin-email}")
    private String adminEmail;

    @Value("${app.bootstrap.admin-password}")
    private String adminPassword;

    @Value("${app.bootstrap.admin-phone}")
    private String adminPhone;

    @Value("${app.bootstrap.seed-demo-data:true}")
    private boolean seedDemoData;

    @Override
    public void run(String... args) {
        University udsm = bootstrapUniversity("UDSM", "University of Dar es Salaam", "Dar es Salaam");
        bootstrapUniversity("ARDHI", "Ardhi University", "Dar es Salaam");
        bootstrapUniversity("MUHAS", "Muhimbili University of Health and Allied Sciences", "Dar es Salaam");
        bootstrapUniversity("DIT", "Dar es Salaam Institute of Technology", "Dar es Salaam");

        User adminUser = bootstrapAdmin();

        if (seedDemoData) {
            User demoLandlord = bootstrapDemoLandlord();
            bootstrapDemoLandlordProfile(demoLandlord, adminUser);
            bootstrapDummyListings(udsm, demoLandlord, adminUser);
        }
    }

    private User bootstrapAdmin() {
        return userRepository.findByEmail(adminEmail.toLowerCase().trim())
                .orElseGet(() -> {
                    User admin = new User();
                    admin.setFullName("CampusStay Admin");
                    admin.setEmail(adminEmail);
                    admin.setPhone(adminPhone);
                    admin.setRole(Role.ADMIN);
                    admin.setPasswordHash(passwordEncoder.encode(adminPassword));
                    return userRepository.save(admin);
                });
    }

    private User bootstrapDemoLandlord() {
        return userRepository.findByEmail("demo.landlord@campusstay.co.tz")
                .orElseGet(() -> {
                    User landlord = new User();
                    landlord.setFullName("CampusStay Demo Landlord");
                    landlord.setEmail("demo.landlord@campusstay.co.tz");
                    landlord.setPhone("+255711111111");
                    landlord.setRole(Role.LANDLORD);
                    landlord.setPasswordHash(passwordEncoder.encode("ChangeMe123!"));
                    return userRepository.save(landlord);
                });
    }

    private void bootstrapDemoLandlordProfile(User landlord, User adminUser) {
        LandlordProfile profile = landlordProfileRepository.findByUserId(landlord.getId())
                .orElseGet(() -> {
                    LandlordProfile created = new LandlordProfile();
                    created.setUser(landlord);
                    created.setIdentityDocumentPlaceholder("NIDA-DEMO-0001");
                    return created;
                });

        profile.setVerificationStatus(LandlordVerificationStatus.APPROVED);
        profile.setReviewedBy(adminUser);
        profile.setReviewedAt(Instant.now());
        profile.setReviewNotes("Bootstrap verified landlord profile");
        landlordProfileRepository.save(profile);
    }

    private void bootstrapDummyListings(University udsm, User demoLandlord, User adminUser) {
        if (listingRepository.countByVerifiedTrue() > 0) {
            return;
        }

        List<Listing> listings = List.of(
                buildListing("Cozy Studio Near UDSM Main Gate",
                        "Ubungo, Dar es Salaam",
                        BigDecimal.valueOf(320000),
                        1,
                        1,
                        OccupancyType.SINGLE,
                        udsm,
                        demoLandlord,
                        adminUser,
                        true),
                buildListing("Twin Shared Room for Female Students",
                        "Sinza, Dar es Salaam",
                        BigDecimal.valueOf(180000),
                        1,
                        1,
                        OccupancyType.SHARED,
                        udsm,
                        demoLandlord,
                        adminUser,
                        false),
                buildListing("Modern Single Room with Wi-Fi",
                        "Mlimani City, Dar es Salaam",
                        BigDecimal.valueOf(380000),
                        1,
                        1,
                        OccupancyType.SINGLE,
                        udsm,
                        demoLandlord,
                        adminUser,
                        true),
                buildListing("Budget Friendly Shared Apartment",
                        "Mwenge, Dar es Salaam",
                        BigDecimal.valueOf(160000),
                        1,
                        1,
                        OccupancyType.SHARED,
                        udsm,
                        demoLandlord,
                        adminUser,
                        false),
                buildListing("Quiet Ensuite Room for Study",
                        "Makongo, Dar es Salaam",
                        BigDecimal.valueOf(290000),
                        1,
                        1,
                        OccupancyType.SINGLE,
                        udsm,
                        demoLandlord,
                        adminUser,
                        true),
                buildListing("Furnished Mini Apartment",
                        "Mikocheni, Dar es Salaam",
                        BigDecimal.valueOf(450000),
                        1,
                        1,
                        OccupancyType.ENTIRE_UNIT,
                        udsm,
                        demoLandlord,
                        adminUser,
                        false)
        );

        listingRepository.saveAll(listings);
    }

    private Listing buildListing(String title,
                                 String address,
                                 BigDecimal rentAmount,
                                 int bedrooms,
                                 int bathrooms,
                                 OccupancyType occupancyType,
                                 University university,
                                 User landlord,
                                 User adminUser,
                                 boolean featured) {
        Listing listing = new Listing();
        listing.setLandlord(landlord);
        listing.setUniversity(university);
        listing.setTitle(title);
        listing.setDescription("Verified student room near UDSM with safe access, clean utilities, and no broker fees.");
        listing.setAddress(address);
        listing.setRentAmount(rentAmount);
        listing.setBedrooms(bedrooms);
        listing.setBathrooms(bathrooms);
        listing.setOccupancyType(occupancyType);
        listing.setListingStatus(ListingStatus.APPROVED);
        listing.setVerified(true);
        listing.setFeatured(featured);
        listing.setApprovedBy(adminUser);
        listing.setApprovedAt(Instant.now());
        listing.syncNormalizedFields();
        return listing;
    }

    private University bootstrapUniversity(String code, String name, String city) {
        return universityRepository.findByCodeIgnoreCase(code)
                .orElseGet(() -> {
                    University university = new University();
                    university.setCode(code);
                    university.setName(name);
                    university.setCity(city);
                    return universityRepository.save(university);
                });
    }
}
