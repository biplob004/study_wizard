// Shared React context object — in its own file (no components) so the
// component file stays fast-refreshable.
import { createContext } from "react";

export const CatalogContext = createContext(null);