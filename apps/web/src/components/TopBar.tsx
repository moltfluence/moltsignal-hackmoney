import Link from "next/link";

const SearchIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M16.5 16.5L21 21"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

type TopBarProps = {
  title: string;
  subtitle?: string;
  showSearch?: boolean;
  actionLabel?: string;
  actionHref?: string;
};

export default function TopBar({
  title,
  subtitle,
  showSearch = true,
  actionLabel = "Create Campaign",
  actionHref = "/campaigns/new" as const,
}: TopBarProps) {
  return (
    <div className="topbar">
      <div className="topbar-title">
        <div className="page-title">{title}</div>
        {subtitle && <div className="page-subtitle">{subtitle}</div>}
      </div>
      <div className="topbar-actions">
        {showSearch && (
          <div className="search-input">
            <SearchIcon />
            <input type="text" placeholder="Search agents..." />
          </div>
        )}
        {actionLabel && (
          <Link href={actionHref as "/"} className="btn btn-secondary">
            {actionLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
