export const OverviewIcon = ({ active = false }: { active?: boolean }) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M4 11.5L12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5z"
      stroke={active ? "#EDEDED" : "#B8BCC6"}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

export const AgentsIcon = ({ active = false }: { active?: boolean }) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="8" cy="8" r="3" stroke={active ? "#EDEDED" : "#B8BCC6"} strokeWidth="1.5" />
    <circle cx="17" cy="9" r="2.5" stroke={active ? "#EDEDED" : "#B8BCC6"} strokeWidth="1.5" />
    <path
      d="M3.5 18c1.2-2.4 3.4-3.5 4.5-3.5s3.3 1.1 4.5 3.5"
      stroke={active ? "#EDEDED" : "#B8BCC6"}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M14.5 17c.7-1.4 2-2.1 2.7-2.1.7 0 2 .7 2.8 2.1"
      stroke={active ? "#EDEDED" : "#B8BCC6"}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export const NetworkIcon = ({ active = false }: { active?: boolean }) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="6" cy="12" r="3" stroke={active ? "#EDEDED" : "#B8BCC6"} strokeWidth="1.5" />
    <circle cx="18" cy="6" r="3" stroke={active ? "#EDEDED" : "#B8BCC6"} strokeWidth="1.5" />
    <circle cx="18" cy="18" r="3" stroke={active ? "#EDEDED" : "#B8BCC6"} strokeWidth="1.5" />
    <path d="M8.5 10.5L15.5 7.5" stroke={active ? "#EDEDED" : "#B8BCC6"} strokeWidth="1.5" />
    <path d="M8.5 13.5L15.5 16.5" stroke={active ? "#EDEDED" : "#B8BCC6"} strokeWidth="1.5" />
  </svg>
);

export const CampaignsIcon = ({ active = false }: { active?: boolean }) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect
      x="4"
      y="5"
      width="16"
      height="14"
      rx="2"
      stroke={active ? "#EDEDED" : "#B8BCC6"}
      strokeWidth="1.5"
    />
    <path d="M8 9h8" stroke={active ? "#EDEDED" : "#B8BCC6"} strokeWidth="1.5" />
    <path d="M8 13h5" stroke={active ? "#EDEDED" : "#B8BCC6"} strokeWidth="1.5" />
  </svg>
);

export const SignalLogo = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="24" cy="24" r="8" stroke="#EDEDED" strokeWidth="1.5" />
    <circle cx="24" cy="24" r="14" stroke="#EDEDED" strokeWidth="1.2" opacity="0.6" />
    <circle cx="24" cy="24" r="20" stroke="#EDEDED" strokeWidth="1" opacity="0.35" />
    <circle cx="24" cy="24" r="3" fill="rgba(229,72,77,0.6)" />
  </svg>
);

export const LockIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="5" y="11" width="14" height="9" rx="2" stroke="#8B90A0" strokeWidth="1.5" />
    <path
      d="M8 11V8a4 4 0 0 1 8 0v3"
      stroke="#8B90A0"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);
