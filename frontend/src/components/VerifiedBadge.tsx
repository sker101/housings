export default function VerifiedBadge() {
  return (
    <span className="verified-badge" aria-label="Verified property">
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2 3.5 6v6.5C3.5 18 7 22.2 12 23c5-0.8 8.5-5 8.5-10.5V6L12 2zm-1.1 15-4.3-4.3 1.4-1.4 2.9 2.9 5.8-5.8 1.4 1.4-7.2 7.2z"
        />
      </svg>
      Verified
    </span>
  );
}
