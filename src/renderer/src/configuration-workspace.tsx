import { BrowserDataTable } from "./browser-data-table";
import { Badge, PanelHeader } from "./surface-support";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";
export type ConfigurationSection = "theme" | "lisp-code-view" | "desktop-surface";

interface ConfigurationSectionDescriptor {
  id: ConfigurationSection;
  label: string;
  summary: string;
  family: string;
}

export function ConfigurationWorkspace({
  selectedSection,
  setSelectedSection,
  themePreference,
  lispParenColors,
  resolvedTheme,
  systemTheme: _systemTheme,
  tooltipScalePercent,
  controlIconScalePercent,
  dockIconScalePercent,
  conversationTextScalePercent,
  sourceCodeTextScalePercent,
  configurationSections,
  normalizeParenDepthColors
}: {
  selectedSection: ConfigurationSection;
  setSelectedSection: (value: ConfigurationSection) => void;
  themePreference: ThemePreference;
  lispParenColors: string[];
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
  tooltipScalePercent: number;
  controlIconScalePercent: number;
  dockIconScalePercent: number;
  conversationTextScalePercent: number;
  sourceCodeTextScalePercent: number;
  configurationSections: ConfigurationSectionDescriptor[];
  normalizeParenDepthColors: (colors?: string[] | null) => string[];
}) {
  const selectedDescriptor =
    configurationSections.find((section) => section.id === selectedSection) ?? configurationSections[0];
  const configurationRows = configurationSections.map((section) => ({
    key: section.id,
    category: section.label,
    family: section.family,
    currentValue:
      section.id === "theme"
        ? themePreference === "system"
          ? `System (${resolvedTheme})`
          : `${themePreference} (${resolvedTheme})`
        : section.id === "lisp-code-view"
          ? `${normalizeParenDepthColors(lispParenColors).length} configured depths`
          : `Tooltip ${tooltipScalePercent}% / Controls ${controlIconScalePercent}% / Dock ${dockIconScalePercent}% / Conversation ${conversationTextScalePercent}% / Source ${sourceCodeTextScalePercent}%`,
    summary: section.summary
  }));

  return (
    <div className="configuration-journey">
      <div className="configuration-layout">
        <section className="configuration-pane panel">
          <PanelHeader
            title="Configuration Categories"
            subtitle="Browse configurable domains in the workspace, then edit the selected category in the inspector."
            helpText="This keeps the left rail shallow while allowing the configuration system to scale to many categories over time."
          />
          <BrowserDataTable
            key="configuration-categories"
            columnTemplate="minmax(0, 1fr) minmax(0, 0.82fr) minmax(0, 1fr) minmax(0, 1.45fr)"
            columns={[
              {
                id: "category",
                label: "Category",
                render: (row) => <strong>{row.category}</strong>,
                sortValue: (row) => row.category,
                searchValue: (row) => `${row.category} ${row.summary} ${row.family}`
              },
              {
                id: "family",
                label: "Family",
                render: (row) => <Badge tone="steady">{row.family}</Badge>,
                sortValue: (row) => row.family
              },
              {
                id: "current",
                label: "Current",
                render: (row) => row.currentValue,
                sortValue: (row) => row.currentValue
              },
              {
                id: "summary",
                label: "Summary",
                render: (row) => row.summary,
                sortValue: (row) => row.summary,
                searchValue: (row) => row.summary
              }
            ]}
            emptyMessage="No configuration categories are available."
            filterLabel="Family"
            filterOptions={Array.from(new Set(configurationRows.map((row) => row.family))).map((value) => ({ label: value, value }))}
            getFilterValue={(row) => row.family}
            getRowKey={(row) => row.key}
            onSelect={(row) => setSelectedSection(row.key as ConfigurationSection)}
            rows={configurationRows}
            searchPlaceholder="Search configuration categories"
            selectedKey={selectedDescriptor.id}
          />
        </section>
      </div>
    </div>
  );
}
