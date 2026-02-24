package tz.campusstay.listing.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import tz.campusstay.listing.OccupancyType;

public record UpdateListingRequest(
        @NotBlank(message = "Title is required")
        @Size(min = 5, max = 200)
        String title,

        @NotBlank(message = "Description is required")
        @Size(min = 20, max = 5000)
        String description,

        @NotBlank(message = "Address is required")
        @Size(min = 5, max = 300)
        String address,

        @NotNull(message = "Rent amount is required")
        @DecimalMin(value = "50000.0", message = "Rent must be at least 50,000 TZS")
        BigDecimal rentAmount,

        @NotNull(message = "Bedrooms is required")
        @Min(value = 0)
        @Max(value = 20)
        Integer bedrooms,

        @NotNull(message = "Bathrooms is required")
        @Min(value = 1)
        @Max(value = 20)
        Integer bathrooms,

        @NotNull(message = "Occupancy type is required")
        OccupancyType occupancyType
) {
}
