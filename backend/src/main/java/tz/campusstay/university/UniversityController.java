package tz.campusstay.university;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/universities")
@RequiredArgsConstructor
public class UniversityController {

    private final UniversityRepository universityRepository;

    @GetMapping
    public List<UniversityResponse> list(@RequestParam(defaultValue = "true") boolean activeOnly) {
        return universityRepository.findAll().stream()
                .filter(university -> !activeOnly || university.isActive())
                .map(university -> new UniversityResponse(
                        university.getId(),
                        university.getCode(),
                        university.getName(),
                        university.getCity(),
                        university.isActive()
                ))
                .toList();
    }
}
