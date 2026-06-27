// Course catalog context.
//
// The catalog is fetched once while the signed-in app is mounted, so deep links
// (e.g. refreshing directly on /courses/vocabulary/learn) can resolve a course
// by id without each screen refetching the list. Lets a screen fall back to a
// loading state while the fetch is in flight, then resolve.
import { useEffect, useMemo, useState } from "react";
import { getCourses } from "../api/client";
import { CatalogContext } from "./context";

export function CatalogProvider({ children }) {
  const [courses, setCourses] = useState(null); // null = not yet loaded
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCourses()
      .then((c) => !cancelled && setCourses(c))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => ({ courses, error }), [courses, error]);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}