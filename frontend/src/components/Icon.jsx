const paths = {
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  area: <path d="M4 4h5M4 4v5m16-5h-5m5 0v5M4 20h5m-5 0v-5m16 5h-5m5 0v-5" />,
  calendar: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4m8-4v4M4 10h16" /></>,
  chart: <><path d="M4 19V5m0 14h16" /><path d="m7 15 4-4 3 2 5-6" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  home: <><path d="m3 11 9-7 9 7" /><path d="M5 10v10h14V10m-9 10v-6h4v6" /></>,
  location: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  message: <path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.7 8.7 0 0 1-3.7-.8L4 20l1.4-3.7A7 7 0 0 1 4 12a7.5 7.5 0 0 1 8-7.5 7.5 7.5 0 0 1 8 7Z" />,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0 0 12 0m-6 6v4m-3 0h6" /></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14-4l-2 2" /><path d="M4 4v5h5m-5 4a8 8 0 0 0 14 4l2-2" /><path d="M20 20v-5h-5" /></>,
  search: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></>,
  send: <><path d="m21 3-8.5 18-2.2-7.3L3 11.5 21 3Z" /><path d="m10.3 13.7 4.3-4.3" /></>,
  spark: <path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z" />
};

export function Icon({ name, size = 20, strokeWidth = 1.8, className = "" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
      width={size}
    >
      {paths[name] || paths.spark}
    </svg>
  );
}
