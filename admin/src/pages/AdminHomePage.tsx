import { Button, NavBrand } from "@sage/ui";
import { useAdminSession } from "@/auth/AdminSession";
import AdminActionButton from "@/components/AdminActionButton";

// Placeholder until the real admin views exist
export default function AdminHomePage() {
  const { user, signOut } = useAdminSession();

  return (
    <main className="flex min-h-screen flex-col items-start gap-6 px-6 py-10 sm:px-[75px]">
      <NavBrand isDarkMode={false} homeHref="/" imgClassName="h-[72px] w-auto" />
      <h3 className="leading-none">SAGE Admin</h3>
      <p className="text-base text-textsecondary">Signed in as {user?.email}</p>
      {/* Stand-ins for the real admin actions, which aren't defined yet */}
      <div className="flex gap-2">
        <AdminActionButton action="create" label="Create" onAction={() => console.info("[admin] create placeholder")} />
        <AdminActionButton action="update" label="Update" onAction={() => console.info("[admin] update placeholder")} />
        <AdminActionButton action="delete" label="Delete" onAction={() => console.info("[admin] delete placeholder")} />
      </div>
      <Button type="button" variant="outline" onClick={signOut}>
        Sign out
      </Button>
    </main>
  );
}
