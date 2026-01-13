interface RailCardConfig {
  type: string;
  title?: string;
  device: string;
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

const version = '__VERSION__';

console.info(
  '%c UK-RAIL-CARD %c v'.concat(version, ' '),
  'color: white; background: navy; font-weight: 700;',
  'color: navy; background: white; font-weight: 700;'
);

class UkRailCard extends HTMLElement {
  private _config?: RailCardConfig;
  private _hass?: HomeAssistant;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static getStubConfig(): RailCardConfig {
    return {
      type: 'custom:uk-rail-card',
      title: 'Rail Services',
      device: 'rail_station',
    };
  }

  static getConfigElement(): HTMLElement {
    return document.createElement('uk-rail-card-editor');
  }

  setConfig(config: RailCardConfig): void {
    if (!config.device) {
      throw new Error('You must define a device');
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
      return '';
    }

    return this._hass.states[entityId]?.state ?? '';
  }

  private render(): void {
    if (!this.shadowRoot || !this._config || !this._hass) {
      return;
    }

    const deviceSuffix = this._config.device;
    const maxEntityId =
      this.findEntityId(`${deviceSuffix}_max_services`) ||
      this.findEntityId('max_services');
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
        scheduled: this.getEntityState(scheduledId) || '-',
        destination,
        estimated: this.getEntityState(estimatedId) || '-',
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
  }
}

class UkRailCardEditor extends HTMLElement {
  private _config?: RailCardConfig;
  private _hass?: HomeAssistant;
  private _entities?: EntityRegistryEntry[];
  private _entitiesLoaded = false;

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
    void this.loadEntities();
    this.render();
  }

  private updateConfigValue(key: keyof RailCardConfig, value: string): void {
    if (!this._config) {
      return;
    }

    const nextConfig: RailCardConfig = { ...this._config };
    const trimmed = value.trim();

    if (key === 'title') {
      if (trimmed) {
        nextConfig.title = trimmed;
      } else {
        delete nextConfig.title;
      }
    } else if (key === 'device') {
      nextConfig.device = trimmed;
    } else if (key === 'device_id') {
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

  private async loadEntities(): Promise<void> {
    if (this._entitiesLoaded || !this._hass?.callWS) {
      return;
    }

    this._entitiesLoaded = true;

    try {
      this._entities = await this._hass.callWS<EntityRegistryEntry[]>({
        type: 'config/entity_registry/list',
      });
    } catch {
      this._entities = [];
    }
  }

  private updateFormData(form: HTMLElement & { data?: Record<string, unknown> }) {
    const nextData = {
      title: this._config?.title ?? '',
      device_id: this._config?.device_id ?? '',
    };
    const current = form.data as { title?: string; device_id?: string } | undefined;

    if (
      current?.title === nextData.title &&
      current?.device_id === nextData.device_id
    ) {
      return;
    }

    form.data = nextData;
  }

  private deriveDeviceSuffix(entityId: string): string {
    const entityName = entityId.split('.')[1] ?? '';

    if (entityName.endsWith('_max_services')) {
      return entityName.replace(/_max_services$/, '');
    }

    const match = entityName.match(
      /^(.*)_\d+_(scheduled_time|destination|estimated_time)$/
    );

    if (match) {
      return match[1];
    }

    return entityName;
  }

  private pickEntityIdForDevice(deviceId: string): string | undefined {
    const entities = (this._entities ?? []).filter(
      (entity) => entity.device_id === deviceId
    );
    const entityIds = entities.map((entity) => entity.entity_id);

    const maxServices = entityIds.find((entityId) =>
      (entityId.split('.')[1] ?? '').endsWith('_max_services')
    );

    if (maxServices) {
      return maxServices;
    }

    const matching = entityIds.find((entityId) =>
      /^(.*)_\d+_(scheduled_time|destination|estimated_time)$/.test(
        entityId.split('.')[1] ?? ''
      )
    );

    return matching ?? entityIds[0];
  }

  private updateDeviceFromDevice(deviceId: string): void {
    if (!this._config) {
      return;
    }

    const trimmed = deviceId.trim();

    if (trimmed && !this._entitiesLoaded) {
      void this.loadEntities().then(() => this.updateDeviceFromDevice(trimmed));
      return;
    }

    const nextConfig: RailCardConfig = { ...this._config };

    if (trimmed) {
      nextConfig.device_id = trimmed;
      const entityId = this.pickEntityIdForDevice(trimmed);
      nextConfig.device = entityId ? this.deriveDeviceSuffix(entityId) : '';
    } else {
      delete nextConfig.device_id;
      nextConfig.device = '';
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
