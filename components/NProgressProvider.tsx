"use client";

import { useEffect, Suspense, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";

// Configure NProgress
NProgress.configure({
  showSpinner: false,
  minimum: 0.1,
  speed: 400,
  trickleSpeed: 200,
});

function NProgressHandler() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Handle click on internal links to start NProgress
  const handleClick = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const anchor = target.closest("a");

    if (!anchor) return;

    const href = anchor.getAttribute("href");

    // Skip if no href, external link, hash link, or special target
    if (
      !href ||
      href.startsWith("http") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("#") ||
      anchor.target === "_blank" ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    ) {
      return;
    }

    // Check if it's a different page (not same as current)
    const currentPath = window.location.pathname;
    const newPath = href.split("?")[0].split("#")[0];

    if (newPath !== currentPath) {
      NProgress.start();
    }
  }, []);

  useEffect(() => {
    // Complete NProgress when route changes
    NProgress.done();
  }, [pathname, searchParams]);

  useEffect(() => {
    // Add global click handler
    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, [handleClick]);

  return null;
}

export function NProgressProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <NProgressHandler />
      </Suspense>
      {children}
    </>
  );
}

// Hook to manually trigger NProgress (for programmatic navigation)
export function useNProgress() {
  return {
    start: () => NProgress.start(),
    done: () => NProgress.done(),
  };
}
