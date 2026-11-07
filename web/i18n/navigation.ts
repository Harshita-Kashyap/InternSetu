import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware Link/useRouter/usePathname/redirect: keep the active language on every navigation.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
