interface DevEnvironmentBannerProps {
  className?: string;
  isDevelopment?: boolean;
}

export function DevEnvironmentBanner({
  className,
  isDevelopment = false,
}: DevEnvironmentBannerProps) {

  if (!isDevelopment) {
    return null;
  }

  return (
    <div
      className={
        className ??
        "fixed top-0 left-0 right-0 h-4 bg-purple-600 text-white text-center text-xs font-medium z-[200] shadow-sm flex items-center justify-center"
      }
    >
      Dev Environment
    </div>
  );
}
