import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import PrivacyPage from "@/pages/PrivacyPage";
import { MemoryRouter } from "react-router-dom";
function LanguageProbe() {
  const { language, setLanguage } = useLanguage();
  return <button onClick={() => setLanguage("vi")}>{language}</button>;
}
beforeEach(() => localStorage.setItem("tenvora_lang", "vi"));
it("public pages remain English without overwriting the workspace preference", () => {
  const view = render(<MemoryRouter><LanguageProvider fixedLanguage="en"><PrivacyPage /><LanguageProbe /></LanguageProvider></MemoryRouter>);
  expect(screen.getByRole("heading", { name: "Tenvora privacy policy" })).toBeInTheDocument();
  expect(document.documentElement.lang).toBe("en");
  fireEvent.click(screen.getByRole("button", { name: "en" }));
  expect(localStorage.getItem("tenvora_lang")).toBe("vi");
  view.rerender(<MemoryRouter><LanguageProvider><LanguageProbe /></LanguageProvider></MemoryRouter>);
  expect(screen.getByRole("button", { name: "vi" })).toBeInTheDocument();
});
