package tz.campusstay.landlord;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tz.campusstay.exception.ResourceNotFoundException;
import tz.campusstay.landlord.dto.LandlordProfileResponse;
import tz.campusstay.user.CurrentUserService;
import tz.campusstay.user.Role;
import tz.campusstay.user.User;

@RestController
@RequestMapping("/api/v1/landlord")
@RequiredArgsConstructor
public class LandlordController {

    private final CurrentUserService currentUserService;
    private final LandlordProfileRepository landlordProfileRepository;
    private final LandlordMapper landlordMapper;

    @GetMapping("/profile")
    public LandlordProfileResponse profile() {
        User currentUser = currentUserService.getCurrentUser();
        if (currentUser.getRole() != Role.LANDLORD) {
            throw new ResourceNotFoundException("Landlord profile not found");
        }

        LandlordProfile profile = landlordProfileRepository.findByUserIdWithUser(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Landlord profile not found"));
        return landlordMapper.toResponse(profile);
    }
}
