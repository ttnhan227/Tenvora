import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import {
  LanguageProvider,
  useLanguage,
  SUPPORTED_LANGUAGES,
} from "@/contexts/LanguageContext";
import {
  translationsMap,
  enTranslations,
  viTranslations,
  esTranslations,
  frTranslations,
  deTranslations,
  pt_BRTranslations as ptBrTranslations,
  idTranslations,
} from "@/locales";

function TestLocalizationConsumer({ testKey, params }: { testKey: string; params?: Record<string, string | number> }) {
  const { language, setLanguage, t, formatCurrency, formatNumber, formatDate } = useLanguage();

  return (
    <div>
      <div data-testid="current-lang">{language}</div>
      <div data-testid="translated">{t(testKey, params)}</div>
      <div data-testid="currency-vnd">{formatCurrency(150000, "VND")}</div>
      <div data-testid="currency-usd">{formatCurrency(45.5, "USD")}</div>
      <div data-testid="formatted-number">{formatNumber(1234567.89, 2)}</div>
      <div data-testid="formatted-date">{formatDate("2026-10-29T12:00:00Z")}</div>

      <button onClick={() => setLanguage("vi")}>Switch VI</button>
      <button onClick={() => setLanguage("en")}>Switch EN</button>
      <button onClick={() => setLanguage("es")}>Switch ES</button>
      <button onClick={() => setLanguage("fr")}>Switch FR</button>
      <button onClick={() => setLanguage("de")}>Switch DE</button>
      <button onClick={() => setLanguage("pt-BR")}>Switch PT</button>
      <button onClick={() => setLanguage("id")}>Switch ID</button>
    </div>
  );
}

describe("Localization Catalogs & Architecture", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("registers 7 supported languages matching official specification", () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(7);
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    expect(codes).toEqual(["en", "vi", "es", "fr", "de", "pt-BR", "id"]);
  });

  it("all 7 translation catalogs contain rich dictionaries", () => {
    const catalogs = [
      { code: "en", dict: enTranslations },
      { code: "vi", dict: viTranslations },
      { code: "es", dict: esTranslations },
      { code: "fr", dict: frTranslations },
      { code: "de", dict: deTranslations },
      { code: "pt-BR", dict: ptBrTranslations },
      { code: "id", dict: idTranslations },
    ];

    for (const { code, dict } of catalogs) {
      expect(Object.keys(dict).length, `Catalog ${code} must have at least 500 keys`).toBeGreaterThanOrEqual(500);
      expect(dict["nav.home"], `Catalog ${code} should have nav.home`).toBeDefined();
      expect(dict["common.save"], `Catalog ${code} should have common.save`).toBeDefined();
      expect(dict["settings.pageTitle"], `Catalog ${code} should have settings.pageTitle`).toBeDefined();
    }
  });

  it("translates navigation and common keys across all 7 languages", () => {
    render(
      <LanguageProvider defaultLanguage="en">
        <TestLocalizationConsumer testKey="nav.home" />
      </LanguageProvider>
    );

    expect(screen.getByTestId("current-lang").textContent).toBe("en");
    expect(screen.getByTestId("translated").textContent).toBe("Home");

    // Switch to Vietnamese
    act(() => {
      screen.getByText("Switch VI").click();
    });
    expect(screen.getByTestId("current-lang").textContent).toBe("vi");
    expect(screen.getByTestId("translated").textContent).toBe("Trang chủ");

    // Switch to Spanish
    act(() => {
      screen.getByText("Switch ES").click();
    });
    expect(screen.getByTestId("current-lang").textContent).toBe("es");
    expect(screen.getByTestId("translated").textContent).toBe("Inicio");

    // Switch to French
    act(() => {
      screen.getByText("Switch FR").click();
    });
    expect(screen.getByTestId("current-lang").textContent).toBe("fr");
    expect(screen.getByTestId("translated").textContent).toBe("Accueil");

    // Switch to German
    act(() => {
      screen.getByText("Switch DE").click();
    });
    expect(screen.getByTestId("current-lang").textContent).toBe("de");
    expect(screen.getByTestId("translated").textContent).toBe("Startseite");

    // Switch to Portuguese
    act(() => {
      screen.getByText("Switch PT").click();
    });
    expect(screen.getByTestId("current-lang").textContent).toBe("pt-BR");
    expect(screen.getByTestId("translated").textContent).toBe("Início");

    // Switch to Indonesian
    act(() => {
      screen.getByText("Switch ID").click();
    });
    expect(screen.getByTestId("current-lang").textContent).toBe("id");
    expect(screen.getByTestId("translated").textContent).toBe("Beranda");
  });

  it("correctly interpolates parameters in parameterized keys", () => {
    render(
      <LanguageProvider defaultLanguage="en">
        <TestLocalizationConsumer
          testKey="proposal.confirmCreateProducts"
          params={{ count: 5 }}
        />
      </LanguageProvider>
    );

    expect(screen.getByTestId("translated").textContent).toBe("Confirm & Create 5 Products");

    act(() => {
      screen.getByText("Switch VI").click();
    });
    expect(screen.getByTestId("translated").textContent).toBe("Xác nhận & Tạo 5 sản phẩm");

    act(() => {
      screen.getByText("Switch ES").click();
    });
    expect(screen.getByTestId("translated").textContent).toBe("Confirmar y crear 5 productos");
  });

  it("falls back gracefully when a key does not exist in the current language", () => {
    render(
      <LanguageProvider defaultLanguage="es">
        <TestLocalizationConsumer testKey="untranslated.nonexistent.key" />
      </LanguageProvider>
    );

    // When key does not exist anywhere and no fallback is given, it returns the key
    expect(screen.getByTestId("translated").textContent).toBe("untranslated.nonexistent.key");
  });

  it("persists language selection to localStorage and updates document element lang", () => {
    render(
      <LanguageProvider defaultLanguage="en">
        <TestLocalizationConsumer testKey="nav.home" />
      </LanguageProvider>
    );

    act(() => {
      screen.getByText("Switch VI").click();
    });

    expect(localStorage.getItem("tenvora_lang")).toBe("vi");
    expect(document.documentElement.lang).toBe("vi");
  });

  it("formats VND currency with proper symbol and formatting", () => {
    render(
      <LanguageProvider defaultLanguage="vi">
        <TestLocalizationConsumer testKey="nav.home" />
      </LanguageProvider>
    );

    const vndText = screen.getByTestId("currency-vnd").textContent;
    expect(vndText).toContain("150");
    expect(vndText).toContain("₫");
  });
});
