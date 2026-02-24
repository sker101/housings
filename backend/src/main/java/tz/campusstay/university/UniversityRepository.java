package tz.campusstay.university;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UniversityRepository extends JpaRepository<University, UUID> {

    Optional<University> findByCodeIgnoreCase(String code);
}
