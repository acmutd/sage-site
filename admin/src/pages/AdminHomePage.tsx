import { Button, NavBrand } from "@sage/ui";
import { useAdminSession } from "@/auth/AdminSession";

// Placeholder until Phase 3 routes by tier
export default function AdminHomePage() {
  const { user, signOut } = useAdminSession();

  return (
    <main className="flex min-h-screen flex-col items-start gap-6 px-6 py-10 sm:px-[75px]">
      <NavBrand isDarkMode={false} homeHref="/" imgClassName="h-[72px] w-auto" />
      <h3 className="leading-none">SAGE Admin</h3>
      <p className="text-base text-textsecondary">Signed in as {user?.email}</p>
      <Button type="button" variant="outline" onClick={signOut}>
        Sign out
      </Button>
    </main>
  );
}
