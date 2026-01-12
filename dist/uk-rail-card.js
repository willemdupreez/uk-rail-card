var _a;
class UkRailCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }
    static getStubConfig() {
        return {
            type: "custom:uk-rail-card",
            title: "Rail Services",
            device: "rail_station",
        };
    }
    setConfig(config) {
        if (!config.device) {
            throw new Error("You must define a device");
        }
        this._config = config;
        this.render();
    }
    set hass(hass) {
        this._hass = hass;
        this.render();
    }
    getCardSize() {
        return 3;
    }
    findEntityId(suffix) {
        if (!this._hass) {
            return undefined;
        }
        return Object.keys(this._hass.states).find((entityId) => entityId.endsWith(suffix));
    }
    getEntityState(entityId) {
        var _a, _b;
        if (!entityId || !this._hass) {
            return "";
        }
        return (_b = (_a = this._hass.states[entityId]) === null || _a === void 0 ? void 0 : _a.state) !== null && _b !== void 0 ? _b : "";
    }
    render() {
        var _a;
        if (!this.shadowRoot || !this._config || !this._hass) {
            return;
        }
        console.log("...::: UK RAIL CARD :::...");
        const deviceSuffix = this._config.device;
        const maxEntityId = this.findEntityId(`${deviceSuffix}_max_services`) ||
            this.findEntityId("max_services");
        const maxServices = Number(this.getEntityState(maxEntityId)) || 0;
        const rows = [];
        for (let index = 1; index <= maxServices; index += 1) {
            const destinationId = this.findEntityId(`${deviceSuffix}_${index}_destination`) ||
                this.findEntityId(`${index}_destination`);
            const destination = this.getEntityState(destinationId).trim();
            if (!destination) {
                break;
            }
            const scheduledId = this.findEntityId(`${deviceSuffix}_${index}_scheduled_time`) ||
                this.findEntityId(`${index}_scheduled_time`);
            const estimatedId = this.findEntityId(`${deviceSuffix}_${index}_estimated_time`) ||
                this.findEntityId(`${index}_estimated_time`);
            rows.push({
                scheduled: this.getEntityState(scheduledId) || "-",
                destination,
                estimated: this.getEntityState(estimatedId) || "-",
            });
        }
        const title = (_a = this._config.title) === null || _a === void 0 ? void 0 : _a.trim();
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
        ${title
            ? `<div class="header"><div class="title">${title}</div></div>`
            : ""}
        ${rows.length
            ? `
              <div class="table">
                <div class="head">Scheduled</div>
                <div class="head">Destination</div>
                <div class="head">Estimated</div>
                ${rows
                .map((row) => `
                      <div class="row">
                        <div class="cell">${row.scheduled}</div>
                        <div class="cell">${row.destination}</div>
                        <div class="cell">${row.estimated}</div>
                      </div>
                    `)
                .join("")}
              </div>
            `
            : `<div class="empty">No services available.</div>`}
      </ha-card>
    `;
    }
}
customElements.define("uk-rail-card", UkRailCard);
window.customCards =
    window.customCards ||
        [];
(_a = window.customCards) === null || _a === void 0 ? void 0 : _a.push({
    type: "uk-rail-card",
    name: "UK Rail Card",
    description: "Displays upcoming rail services with scheduled and estimated times.",
});
//# sourceMappingURL=uk-rail-card.js.map
