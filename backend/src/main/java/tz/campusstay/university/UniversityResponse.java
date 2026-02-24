package tz.campusstay.university;

import java.util.UUID;

public record UniversityResponse(
        UUID id,
        String code,
        String name,
        String city,
        boolean active
) {
}
