import { Link } from "react-router-dom";

interface NavBrandProps {
  isDarkMode: boolean;
  className?: string;
  imgClassName?: string;
  logoDarkSrc?: string;
  logoLightSrc?: string;
  alt?: string;
}

export function NavBrand({
  isDarkMode,
  className = "ml-0",
  imgClassName = "h-8 w-auto",
  logoDarkSrc = "/Sage_Logo_Dark.svg",
  logoLightSrc = "/Sage_Logo_Light.svg",
  alt = "SAGE",
}: NavBrandProps) {
  return (
    <Link to="/" className={className}>
      <img
        src={isDarkMode ? logoLightSrc : logoDarkSrc}
        alt={alt}
        className={imgClassName}
      />
    </Link>
  );
}
