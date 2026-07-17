"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import PageLoader from "./page-loader";

type PageTransitionProviderProps = {
  children: ReactNode;
};

export default function PageTransitionProvider({
  children,
}: PageTransitionProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const firstLoad = useRef(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;

      const firstLoadTimer = setTimeout(() => {
        setLoading(false);
      }, 2200);

      return () => clearTimeout(firstLoadTimer);
    }

    setLoading(true);

    const routeTimer = setTimeout(() => {
      setLoading(false);
    }, 1200);

    return () => clearTimeout(routeTimer);
  }, [pathname, searchParams]);

  return (
    <>
      <PageLoader loading={loading} />
      {children}
    </>
  );
}