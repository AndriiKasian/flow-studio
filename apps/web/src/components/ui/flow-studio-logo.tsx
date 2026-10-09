interface FlowStudioLogoProps {
  size?: number;
  className?: string;
}

export function FlowStudioLogo({
  size = 32,
  className,
}: FlowStudioLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="flow-studio-logo-gradient"
          x1="8"
          y1="8"
          x2="55"
          y2="56"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#60A5FA" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>

      <g
        stroke="url(#flow-studio-logo-gradient)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M13 11L49 24L13 35L49 48L13 57" />
        <path d="M13 11V57" />
      </g>

      <g fill="url(#flow-studio-logo-gradient)">
        <circle cx="13" cy="11" r="7" />
        <circle cx="49" cy="24" r="7" />
        <circle cx="13" cy="35" r="7" />
        <circle cx="49" cy="48" r="7" />
        <circle cx="13" cy="57" r="7" />
      </g>
    </svg>
  );
}