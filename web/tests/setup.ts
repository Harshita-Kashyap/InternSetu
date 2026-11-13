import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());

// tr("English") -> English: component tests don't need real catalogs (catalog coverage is tested in i18n.test.ts)
vi.mock("../i18n/useT", () => ({ useT: () => (s: string) => s }));

// MicButton / ReadAloud ask next-intl for the current language
vi.mock("next-intl", async (orig) => ({ ...(await orig<typeof import("next-intl")>()), useLocale: () => "en" }));
