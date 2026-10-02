import { CalorieFavoritesManager } from "@/components/calorie-favorites-manager";
import { getCalorieFavorites } from "@/lib/calorie-favorites";
import { isLocalPreview, isLocalReadOnly } from "@/lib/supabase/config";
import { requireUser } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const [favorites, user] = await Promise.all([
    getCalorieFavorites(),
    isLocalPreview ? Promise.resolve({ email: "Local preview" }) : requireUser().then(({ supabase }) => supabase.auth.getUser()).then(({ data }) => data.user),
  ]);

  return <section className="settings-page page-sheet glass">
    <div><p className="eyebrow" style={{ color: "var(--leaf)" }}>Your little corner</p><h1 className="section-title">Master settings.</h1><p className="section-subtitle">Manage reusable values that make daily tracking faster.</p></div>
    <CalorieFavoritesManager initialFavorites={favorites} localPreview={isLocalPreview} readOnly={isLocalReadOnly} />
    <aside className="settings-account"><p className="font-bold">Signed in as</p><p>{user?.email}</p><small>{isLocalPreview ? "This is a local-only visual preview." : "Favorites are private and protected by account ownership policies."}</small></aside>
  </section>;
}
