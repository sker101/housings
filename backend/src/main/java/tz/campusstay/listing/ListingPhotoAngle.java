package tz.campusstay.listing;

public enum ListingPhotoAngle {
    BEDROOM(1),
    KITCHEN(2),
    BATHROOM(3),
    EXTERIOR(4),
    OTHER(5);

    private final int sortOrder;

    ListingPhotoAngle(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public int sortOrder() {
        return sortOrder;
    }
}

