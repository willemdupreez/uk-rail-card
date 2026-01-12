interface RailCardConfig {
  type: string;
  title?: string;
  device: string;
}

type HomeAssistant = {
  states: Record<
    string,
    { state: string; attributes: Record<string, unknown> }
  >;
};

const version = '__VERSION__';

console.info(
  "%c UK-RAIL-CARD %c ".concat(version, " "),
  "color: white; background: navy; font-weight: 700;",
  "color: navy; background: white; font-weight: 700;"
);

class UkRailCard extends HTMLElement {
  private _config?: RailCardConfig;
  private _hass?: HomeAssistant;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  static getStubConfig(): RailCardConfig {
    return {
      type: "custom:uk-rail-card",
      title: "Rail Services",
      device: "rail_station",
    };
  }

  static getConfigElement(): HTMLElement {
    return document.createElement("uk-rail-card-editor");
  }

  setConfig(config: RailCardConfig): void {
    if (!config.device) {
      throw new Error("You must define a device");
    }

    this._config = config;
    this.render();
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    this.render();
  }

  getCardSize(): number {
    return 3;
  }

  private findEntityId(suffix: string): string | undefined {
    if (!this._hass) {
      return undefined;
    }

    return Object.keys(this._hass.states).find((entityId) =>
      entityId.endsWith(suffix)
    );
  }

  private getEntityState(entityId?: string): string {
    if (!entityId || !this._hass) {
      return "";
    }

    return this._hass.states[entityId]?.state ?? "";
  }

  private render(): void {
    if (!this.shadowRoot || !this._config || !this._hass) {
      return;
    }

    const deviceSuffix = this._config.device;
    const maxEntityId =
      this.findEntityId(`${deviceSuffix}_max_services`) ||
      this.findEntityId("max_services");
    const maxServices = Number(this.getEntityState(maxEntityId)) || 0;

    const rows: Array<{
      scheduled: string;
      destination: string;
      estimated: string;
    }> = [];

    for (let index = 1; index <= maxServices; index += 1) {
      const destinationId =
        this.findEntityId(`${deviceSuffix}_${index}_destination`) ||
        this.findEntityId(`${index}_destination`);
      const destination = this.getEntityState(destinationId).trim();

      if (!destination) {
        break;
      }

      const scheduledId =
        this.findEntityId(`${deviceSuffix}_${index}_scheduled_time`) ||
        this.findEntityId(`${index}_scheduled_time`);
      const estimatedId =
        this.findEntityId(`${deviceSuffix}_${index}_estimated_time`) ||
        this.findEntityId(`${index}_estimated_time`);

      rows.push({
        scheduled: this.getEntityState(scheduledId) || "-",
        destination,
        estimated: this.getEntityState(estimatedId) || "-",
      });
    }

    const title = this._config.title?.trim();

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        ha-card {
          overflow: hidden;
        }

        .header {
          padding: 16px 16px 0 16px;
        }

        .title {
          font-size: 1.1rem;
          font-weight: 600;
          line-height: 1.4;
        }

        .table {
          display: grid;
          grid-template-columns: minmax(70px, 0.8fr) 2fr minmax(70px, 0.8fr);
          gap: 4px 12px;
          padding: 16px;
        }

        .head {
          font-size: 0.75rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--secondary-text-color);
        }

        .row {
          display: contents;
          font-size: 0.95rem;
        }

        .cell {
          padding: 4px 0;
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        }

        .row:last-of-type .cell {
          border-bottom: none;
        }

        .empty {
          padding: 16px;
          color: var(--secondary-text-color);
          font-style: italic;
        }
      </style>
      <ha-card>
        ${
          title
            ? `<div class="header"><div class="title">${title}</div></div>`
            : ""
        }
        ${
          rows.length
            ? `
              <div class="table">
                <div class="head">Scheduled</div>
                <div class="head">Destination</div>
                <div class="head">Estimated</div>
                ${rows
                  .map(
                    (row) => `
                      <div class="row">
                        <div class="cell">${row.scheduled}</div>
                        <div class="cell">${row.destination}</div>
                        <div class="cell">${row.estimated}</div>
                      </div>
                    `
                  )
                  .join("")}
              </div>
            `
            : `<div class="empty">No services available.</div>`
        }
      </ha-card>
    `;
  }
}

class UkRailCardEditor extends HTMLElement {
  private _config?: RailCardConfig;
  private _hass?: HomeAssistant;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  setConfig(config: RailCardConfig): void {
    this._config = { ...config };
    this.render();
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    this.render();
  }

  private updateConfigValue(key: keyof RailCardConfig, value: string): void {
    if (!this._config) {
      return;
    }

    const nextConfig: RailCardConfig = { ...this._config };
    const trimmed = value.trim();

    if (key === "title") {
      if (trimmed) {
        nextConfig.title = trimmed;
      } else {
        delete nextConfig.title;
      }
    } else if (key === "device") {
      nextConfig.device = trimmed;
    } else {
      nextConfig[key] = value;
    }

    this._config = nextConfig;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: nextConfig },
        bubbles: true,
        composed: true,
      })
    );
  }

  private render(): void {
    if (!this.shadowRoot) {
      return;
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 8px 0;
        }

        .form {
          display: grid;
          gap: 16px;
        }
      </style>
      <div class="form">
        <ha-textfield
          label="Title (optional)"
          data-field="title"
        ></ha-textfield>
        <ha-textfield
          label="Device suffix"
          helper="Matches entities ending in \${device}_max_services, \${device}_1_destination, etc."
          persistent-helper
          data-field="device"
        ></ha-textfield>
      </div>
    `;

    this.shadowRoot.querySelectorAll("ha-textfield").forEach((field) => {
      const input = field as { value?: string; dataset?: DOMStringMap };
      const key = input.dataset?.field as keyof RailCardConfig | undefined;

      if (key === "title") {
        input.value = this._config?.title ?? "";
      }

      if (key === "device") {
        input.value = this._config?.device ?? "";
      }

      field.addEventListener("input", (event) => {
        const target = event.target as {
          value?: string;
          dataset?: DOMStringMap;
        };
        const key = target.dataset?.field as keyof RailCardConfig | undefined;
        const value = target.value ?? "";

        if (!key) {
          return;
        }

        this.updateConfigValue(key, value);
      });
    });
  }
}

customElements.define("uk-rail-card", UkRailCard);
customElements.define("uk-rail-card-editor", UkRailCardEditor);

(window as { customCards?: Array<Record<string, unknown>> }).customCards =
  (window as { customCards?: Array<Record<string, unknown>> }).customCards ||
  [];

(window as { customCards?: Array<Record<string, unknown>> }).customCards?.push({
  type: "uk-rail-card",
  name: "UK Rail Card",
  description:
    "Displays upcoming rail services with scheduled and estimated times.",
});
