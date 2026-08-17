import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export function Logo({ className = '', ...props }: LogoProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-12 h-12 ${className}`}
      {...props}
    >
      {/* Main Cloud Shape */}
      <path
        d="M32 60C32 44.536 44.536 32 60 32C71.5 32 81.3 38.9 85.5 49C87 48.6 88.5 48.5 90 48.5C100.2 48.5 108.5 56.8 108.5 67C108.5 77.2 100.2 85.5 90 85.5H32C22 85.5 14 77.4 14 67.5C14 57.6 22 49.5 32 49.5V60Z"
        fill="currentColor"
        className="cloud-base opacity-90"
      />

      {/* Dark inner shape simulating the central drop merging */}
      <path
        d="M60 40C54.5 40 50 44.5 50 50C50 54 52.5 57.5 56 59C58 65 58 70 55 75C51 81.5 45 80 45 80C45 80 50 88 60 88C70 88 75 80 75 80C75 80 69 81.5 65 75C62 70 62 65 64 59C67.5 57.5 70 54 70 50C70 44.5 65.5 40 60 40Z"
        fill="currentColor"
        className="cloud-inner-drop opacity-40"
      />

      {/* Small floating dots inside the cloud */}
      <circle cx="45" cy="40" r="2" fill="currentColor" className="opacity-70" />
      <circle cx="75" cy="38" r="3" fill="currentColor" className="opacity-70" />
      <circle cx="82" cy="48" r="4" fill="currentColor" className="opacity-70" />

      {/* White expanding drop */}
      <circle cx="50" cy="80" r="10" fill="currentColor" className="opacity-100" />
      <circle cx="50" cy="100" r="6" fill="currentColor" className="opacity-80" />
      <circle cx="35" cy="85" r="4" fill="currentColor" className="opacity-60" />
      <circle cx="38" cy="95" r="2" fill="currentColor" className="opacity-50" />

      {/* Greenish water drop extending down - now white with partial opacity */}
      <path
        d="M75 75C75 85 85 85 85 95C85 100.5 80.5 105 75 105C69.5 105 65 100.5 65 95C65 85 75 85 75 75Z"
        fill="currentColor"
        className="opacity-70"
      />
    </svg>
  );
}
