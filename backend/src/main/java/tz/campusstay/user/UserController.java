package tz.campusstay.user;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tz.campusstay.landlord.LandlordProfileRepository;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final CurrentUserService currentUserService;
    private final LandlordProfileRepository landlordProfileRepository;

    @GetMapping("/me")
    public UserProfileResponse me() {
        User user = currentUserService.getCurrentUser();
        String landlordStatus = null;

        if (user.getRole() == Role.LANDLORD) {
            landlordStatus = landlordProfileRepository.findByUserId(user.getId())
                    .map(profile -> profile.getVerificationStatus().name())
                    .orElse(null);
        }

        return new UserProfileResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole().name(),
                user.getAccountStatus().name(),
                landlordStatus
        );
    }
}
