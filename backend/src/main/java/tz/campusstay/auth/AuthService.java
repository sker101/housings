package tz.campusstay.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tz.campusstay.auth.dto.AuthResponse;
import tz.campusstay.auth.dto.LoginRequest;
import tz.campusstay.auth.dto.RegisterLandlordRequest;
import tz.campusstay.auth.dto.RegisterStudentRequest;
import tz.campusstay.exception.BadRequestException;
import tz.campusstay.landlord.LandlordProfile;
import tz.campusstay.landlord.LandlordProfileRepository;
import tz.campusstay.landlord.LandlordVerificationStatus;
import tz.campusstay.security.JwtService;
import tz.campusstay.security.UserPrincipal;
import tz.campusstay.user.Role;
import tz.campusstay.user.User;
import tz.campusstay.user.UserRepository;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final LandlordProfileRepository landlordProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse registerStudent(RegisterStudentRequest request) {
        validateUniqueEmail(request.email());
        User user = new User();
        user.setFullName(request.fullName().trim());
        user.setEmail(request.email().toLowerCase().trim());
        user.setPhone(request.phone().trim());
        user.setRole(Role.STUDENT);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        User saved = userRepository.save(user);

        return buildResponse(saved, null);
    }

    @Transactional
    public AuthResponse registerLandlord(RegisterLandlordRequest request) {
        validateUniqueEmail(request.email());

        User landlord = new User();
        landlord.setFullName(request.fullName().trim());
        landlord.setEmail(request.email().toLowerCase().trim());
        landlord.setPhone(request.phone().trim());
        landlord.setRole(Role.LANDLORD);
        landlord.setPasswordHash(passwordEncoder.encode(request.password()));
        User savedLandlord = userRepository.save(landlord);

        LandlordProfile profile = new LandlordProfile();
        profile.setUser(savedLandlord);
        profile.setIdentityDocumentPlaceholder(request.identityDocumentPlaceholder().trim());
        profile.setVerificationStatus(LandlordVerificationStatus.PENDING);
        landlordProfileRepository.save(profile);

        return buildResponse(savedLandlord, LandlordVerificationStatus.PENDING.name());
    }

    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email().toLowerCase().trim(), request.password())
            );
        } catch (AuthenticationException ex) {
            throw new BadRequestException("Invalid credentials");
        }

        User user = userRepository.findByEmail(request.email().toLowerCase().trim())
                .orElseThrow(() -> new BadRequestException("Invalid credentials"));

        String landlordStatus = null;
        if (user.getRole() == Role.LANDLORD) {
            landlordStatus = landlordProfileRepository.findByUserId(user.getId())
                    .map(profile -> profile.getVerificationStatus().name())
                    .orElse(null);
        }

        return buildResponse(user, landlordStatus);
    }

    private AuthResponse buildResponse(User user, String landlordStatus) {
        UserPrincipal principal = UserPrincipal.fromUser(user);
        String token = jwtService.generateToken(principal);

        return new AuthResponse(
                token,
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole().name(),
                landlordStatus
        );
    }

    private void validateUniqueEmail(String email) {
        if (userRepository.existsByEmail(email.toLowerCase().trim())) {
            throw new BadRequestException("Email already exists");
        }
    }
}
