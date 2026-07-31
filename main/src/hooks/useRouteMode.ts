import { useLocation } from "react-router-dom";

const PUBLIC_ROUTES = ["/", "/login", "/signup", "/forgot-password"];

export function useRouteMode() {
  const location = useLocation();
  const isInWebapp = !PUBLIC_ROUTES.includes(location.pathname);

  return {
    isInWebapp,
    pathname: location.pathname,
  };
}
