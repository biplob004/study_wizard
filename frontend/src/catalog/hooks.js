// Catalog hooks — kept separate from the CatalogProvider component so the
// component file stays fast-refreshable.
import { useContext } from "react";
import { CatalogContext } from "./context";

/** All courses, or `null` while the catalog is still loading. */
export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used inside a CatalogProvider");
  return ctx;
}

/** Look up a single course by id. Returns `undefined` while loading, `null` if not found. */
export function useCourse(courseId) {
  const { courses } = useCatalog();
  if (courses === null) return undefined; // still loading
  return courses.find((c) => c.id === courseId) ?? null;
}