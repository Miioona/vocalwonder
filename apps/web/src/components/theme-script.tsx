/**
 * Setzt die Theme-Klasse, **bevor** die Seite gezeichnet wird.
 *
 * Der Einstellungs-Store liegt in `localStorage` und wird erst nach der Hydration gelesen —
 * bis dahin wäre die Seite in der Standardfassung zu sehen. Bei einem hellen Theme hieße das
 * ein dunkles Aufblitzen bei jedem Laden. Deshalb dieses winzige Skript im Kopf des
 * Dokuments, das denselben Speicherort direkt ausliest.
 */
export const ThemeScript = () => (
  <script
    // Muss synchron laufen, deshalb kein React-Effekt und kein externes Modul.
    dangerouslySetInnerHTML={{
      __html: `
try {
  var stored = JSON.parse(localStorage.getItem("vocalwonder-settings") || "{}");
  var theme = (stored && stored.state && stored.state.theme) || "dark";
  document.documentElement.classList.toggle("dark", theme !== "light");
} catch (error) {
  document.documentElement.classList.add("dark");
}`.trim(),
    }}
  />
);
