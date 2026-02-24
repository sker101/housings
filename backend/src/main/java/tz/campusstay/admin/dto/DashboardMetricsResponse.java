package tz.campusstay.admin.dto;

public record DashboardMetricsResponse(
        long totalUsers,
        long totalListings,
        long pendingApprovals,
        long verifiedProperties,
        long flaggedListings
) {
}
