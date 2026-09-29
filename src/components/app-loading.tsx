import { Leaf } from "lucide-react";

type AppLoadingProps = {
  fullPage?: boolean;
};

export function AppLoading({ fullPage = false }: AppLoadingProps) {
  return (
    <div
      className={`app-loading${fullPage ? " app-loading-full" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <span className="app-loading-icon" aria-hidden="true">
        <Leaf size={30} strokeWidth={2.1} />
      </span>
      <span className="app-loading-text">Loading your page...</span>
    </div>
  );
}
