package tz.campusstay.auth;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tz.campusstay.auth.dto.AuthResponse;
import tz.campusstay.auth.dto.LoginRequest;
import tz.campusstay.auth.dto.RegisterLandlordRequest;
import tz.campusstay.auth.dto.RegisterStudentRequest;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register/student")
    public ResponseEntity<AuthResponse> registerStudent(@Valid @RequestBody RegisterStudentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.registerStudent(request));
    }

    @PostMapping("/register/landlord")
    public ResponseEntity<AuthResponse> registerLandlord(@Valid @RequestBody RegisterLandlordRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.registerLandlord(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }
}
