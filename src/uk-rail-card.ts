interface RailCardConfig {
  type: string;
  title?: string;
  device_id?: string;
}

type HomeAssistant = {
  states: Record<
    string,
    { state: string; attributes: Record<string, unknown> }
  >;
  callWS?: <T>(message: Record<string, unknown>) => Promise<T>;
};

type EntityRegistryEntry = {
  entity_id: string;
  device_id?: string | null;
};

type DeviceRegistryEntry = {
  id: string;
  name?: string | null;
  name_by_user?: string | null;
};

const version = '__VERSION__';

console.info(
  '%c UK-RAIL-CARD %c v'.concat(version, ' '),
  'color: white; background: navy; font-weight: 700;',
  'color: navy; background: white; font-weight: 700;'
);

class UkRailCard extends HTMLElement {
  private _config?: RailCardConfig;
  private _hass?: HomeAssistant;
  private _entityRegistry?: EntityRegistryEntry[];
  private _entityRegistryLoaded = false;
  private _deviceRegistry?: DeviceRegistryEntry[];
  private _deviceRegistryLoaded = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static getStubConfig(): RailCardConfig {
    return {
      type: 'custom:uk-rail-card',
      title: 'Rail Services',
      device_id: '',
    };
  }

  static getConfigElement(): HTMLElement {
    return document.createElement('uk-rail-card-editor');
  }

  setConfig(config: RailCardConfig): void {
    if (!config.device_id) {
      throw new Error('You must define a device_id');
    }

    this._config = config;
    void this.loadEntityRegistry();
    void this.loadDeviceRegistry();
    this.render();
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    void this.loadEntityRegistry();
    void this.loadDeviceRegistry();
    this.render();
  }

  getCardSize(): number {
    return 3;
  }

  private async loadEntityRegistry(): Promise<void> {
    if (
      this._entityRegistryLoaded ||
      !this._hass?.callWS ||
      !this._config?.device_id
    ) {
      return;
    }

    this._entityRegistryLoaded = true;

    try {
      this._entityRegistry = await this._hass.callWS<EntityRegistryEntry[]>({
        type: 'config/entity_registry/list',
      });
    } catch {
      this._entityRegistry = [];
    }

    this.render();
  }

  private async loadDeviceRegistry(): Promise<void> {
    if (
      this._deviceRegistryLoaded ||
      !this._hass?.callWS ||
      !this._config?.device_id
    ) {
      return;
    }

    this._deviceRegistryLoaded = true;

    try {
      this._deviceRegistry = await this._hass.callWS<DeviceRegistryEntry[]>({
        type: 'config/device_registry/list',
      });
    } catch {
      this._deviceRegistry = [];
    }

    this.render();
  }

  private getDeviceName(): string | undefined {
    const deviceId = this._config?.device_id;

    if (!deviceId) {
      return undefined;
    }

    if (!this._deviceRegistryLoaded) {
      void this.loadDeviceRegistry();
      return undefined;
    }

    const device = (this._deviceRegistry ?? []).find(
      (entry) => entry.id === deviceId
    );
    const name = device?.name_by_user || device?.name || '';

    if (!name) {
      return undefined;
    }

    return name.replace(/^Rail departure board:\s*/i, '').trim();
  }
  private findEntityId(suffix: string): string | undefined {
    if (!this._hass) {
      return undefined;
    }

    const entityIds = Object.keys(this._hass.states);

    if (this._config?.device_id) {
      if (!this._entityRegistryLoaded) {
        void this.loadEntityRegistry();
        return undefined;
      }

      const deviceEntities = (this._entityRegistry ?? []).filter(
        (entity) => entity.device_id === this._config?.device_id
      );
      const deviceEntityIds = deviceEntities.map((entity) => entity.entity_id);
      const scopedIds = entityIds.filter((entityId) =>
        deviceEntityIds.includes(entityId)
      );

      return scopedIds.find((entityId) => entityId.endsWith(suffix));
    }

    return entityIds.find((entityId) => entityId.endsWith(suffix));
  }

  private getEntityState(entityId?: string): string {
    if (!entityId || !this._hass) {
      return '';
    }

    return this._hass.states[entityId]?.state ?? '';
  }

  private render(): void {
    if (!this.shadowRoot || !this._config || !this._hass) {
      return;
    }

    const maxEntityId =
      this.findEntityId('_max_services') || this.findEntityId('max_services');
    const maxServices = Number(this.getEntityState(maxEntityId)) || 0;
    const lastUpdatedEntityId =
      this.findEntityId('_last_updated') || this.findEntityId('last_updated');
    const lastUpdated = this.getEntityState(lastUpdatedEntityId);
    const lastUpdatedDate = lastUpdated ? new Date(lastUpdated) : null;
    const lastUpdatedIso =
      lastUpdatedDate && !Number.isNaN(lastUpdatedDate.getTime())
        ? lastUpdatedDate.toISOString()
        : '';

    const rows: Array<{
      scheduled: string;
      destination: string;
      estimated: string;
    }> = [];

    for (let index = 1; index <= maxServices; index += 1) {
      const destinationId =
        this.findEntityId(`_${index}_destination`) ||
        this.findEntityId(`${index}_destination`);

      const destination = this.getEntityState(destinationId).trim();

      if (!destination) {
        break;
      }

      const scheduledId =
        this.findEntityId(`_${index}_scheduled_time`) ||
        this.findEntityId(`${index}_scheduled_time`);
      const estimatedId =
        this.findEntityId(`_${index}_estimated_time`) ||
        this.findEntityId(`${index}_estimated_time`);

      rows.push({
        scheduled: this.getEntityState(scheduledId) || '-',
        destination,
        estimated: this.getEntityState(estimatedId) || '-',
      });
    }

    const title = this._config.title?.trim() || this.getDeviceName();

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        ha-card {
          overflow: hidden;
        }

        .header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
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

        .status {
          font-size: 0.8rem;
          color: var(--secondary-text-color);
          white-space: nowrap;
          margin-left: -30px;
        }
      </style>
      <ha-card>
        ${
          title
            ? `
              <div class="header">
                <div class="title">${title}</div>
                ${
                  lastUpdatedIso
                    ? `<div class="status"><ha-relative-time></ha-relative-time></div>`
                    : ''
                }
              </div>
            `
            : ''
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
                  .join('')}
              </div>
            `
            : `<div class="empty">No services available.</div>`
        }
      </ha-card>
    `;

    if (lastUpdatedIso) {
      const relativeTime = this.shadowRoot.querySelector('ha-relative-time') as
        | (HTMLElement & { hass?: HomeAssistant; datetime?: string })
        | null;

      if (relativeTime) {
        relativeTime.hass = this._hass;
        relativeTime.datetime = lastUpdatedIso;
      }
    }
  }
}

class UkRailCardEditor extends HTMLElement {
  private _config?: RailCardConfig;
  private _hass?: HomeAssistant;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
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
    if (key === 'title') {
      if (value) {
        nextConfig.title = value;
      } else {
        delete nextConfig.title;
      }
    } else if (key === 'device_id') {
      const trimmed = value.trim();
      if (trimmed) {
        nextConfig.device_id = trimmed;
      } else {
        delete nextConfig.device_id;
      }
    } else {
      nextConfig[key] = value;
    }

    this._config = nextConfig;
    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config: nextConfig },
        bubbles: true,
        composed: true,
      })
    );
  }

  private updateFormData(
    form: HTMLElement & { data?: Record<string, unknown> }
  ) {
    const nextData = {
      title: this._config?.title ?? '',
      device_id: this._config?.device_id ?? '',
    };
    const current = form.data as
      | { title?: string; device_id?: string }
      | undefined;

    if (
      current?.title === nextData.title &&
      current?.device_id === nextData.device_id
    ) {
      return;
    }

    form.data = nextData;
  }

  private updateDeviceFromDevice(deviceId: string): void {
    if (!this._config) {
      return;
    }

    const trimmed = deviceId.trim();

    const nextConfig: RailCardConfig = { ...this._config };

    if (trimmed) {
      nextConfig.device_id = trimmed;
    } else {
      delete nextConfig.device_id;
    }

    this._config = nextConfig;
    this.dispatchEvent(
      new CustomEvent('config-changed', {
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

    const form = this.shadowRoot.querySelector('ha-form') as
      | (HTMLElement & {
          hass?: HomeAssistant;
          data?: Record<string, unknown>;
          schema?: Array<Record<string, unknown>>;
          computeLabel?: (schema: { name: string }) => string;
          computeHelper?: (schema: { name: string }) => string;
        })
      | null;

    if (!form) {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            padding: 8px 0;
          }
        </style>
        <ha-form></ha-form>
      `;
    }

    const resolvedForm = (this.shadowRoot.querySelector('ha-form') as
      | (HTMLElement & {
          hass?: HomeAssistant;
          data?: Record<string, unknown>;
          schema?: Array<Record<string, unknown>>;
          computeLabel?: (schema: { name: string }) => string;
          computeHelper?: (schema: { name: string }) => string;
        })
      | null)!;

    resolvedForm.hass = this._hass;
    this.updateFormData(resolvedForm);
    resolvedForm.schema = [
      { name: 'title', selector: { text: {} } },
      {
        name: 'device_id',
        required: true,
        selector: {
          device: { manufacturer: 'rail2mqtt', model: 'Departure Board' },
        },
      },
    ];
    resolvedForm.computeLabel = (schema: { name: string }) => {
      if (schema.name === 'title') {
        return 'Title (optional)';
      }

      return 'Device';
    };
    resolvedForm.computeHelper = (schema: { name: string }) => {
      if (schema.name === 'device_id') {
        return 'Select a rail2mqtt Departure Board device.';
      }

      return '';
    };
    if (!resolvedForm.hasAttribute('data-listener')) {
      resolvedForm.setAttribute('data-listener', 'true');
      resolvedForm.addEventListener('value-changed', (event) => {
        const detail = (event as CustomEvent).detail as {
          value?: { title?: string; device_id?: string };
        };
        const value = detail.value ?? {};

        if (value.title !== (this._config?.title ?? '')) {
          this.updateConfigValue('title', value.title ?? '');
        }

        if (value.device_id !== (this._config?.device_id ?? '')) {
          this.updateDeviceFromDevice(value.device_id ?? '');
        }
      });
    }
  }
}

customElements.define('uk-rail-card', UkRailCard);
customElements.define('uk-rail-card-editor', UkRailCardEditor);

(window as { customCards?: Array<Record<string, unknown>> }).customCards =
  (window as { customCards?: Array<Record<string, unknown>> }).customCards ||
  [];

(window as { customCards?: Array<Record<string, unknown>> }).customCards?.push({
  type: 'uk-rail-card',
  name: 'UK Rail Card',
  description:
    'Displays upcoming rail services with scheduled and estimated times.',
});
