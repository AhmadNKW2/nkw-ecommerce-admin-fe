import Image from "next/image";

type AdminLogoProps = {
  src?: string | null;
  pending?: boolean;
  size?: number;
  className?: string;
  alt?: string;
};

function AdminLogoPlaceholder({
  className = "h-15 w-15 shrink-0 rounded-r2",
}: {
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center bg-primary ${className}`}
    >
      <svg
        className="h-5 w-5 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    </div>
  );
}

function AdminLogoSkeleton({
  className = "h-15 w-15 shrink-0 rounded-r2",
}: {
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse bg-gray-100 ${className}`}
      aria-hidden="true"
    />
  );
}

export function AdminLogo({
  src,
  pending = false,
  size = 60,
  className = "h-15 w-15 shrink-0 rounded-r2 object-contain",
  alt = "Admin logo",
}: AdminLogoProps) {
  if (pending) {
    return <AdminLogoSkeleton className={className} />;
  }

  const logoSrc = src?.trim();

  if (!logoSrc) {
    return <AdminLogoPlaceholder className={className} />;
  }

  return (
    <Image
      src={logoSrc}
      alt={alt}
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
