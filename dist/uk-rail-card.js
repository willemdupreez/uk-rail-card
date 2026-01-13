var _a;
const version = '0.2.26';
console.info('%c UK-RAIL-CARD %c v'.concat(version, ' '), 'color: white; background: navy; font-weight: 700;', 'color: navy; background: white; font-weight: 700;');
class UkRailCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }
    static getStubConfig() {
        return {
            type: 'custom:uk-rail-card',
            title: 'Rail Services',
            device: 'rail_station',
        };
    }
    static getConfigElement() {
        return document.createElement('uk-rail-card-editor');
    }
    setConfig(config) {
        if (!config.device) {
            throw new Error('You must define a device');
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
            return '';
        }
        return (_b = (_a = this._hass.states[entityId]) === null || _a === void 0 ? void 0 : _a.state) !== null && _b !== void 0 ? _b : '';
    }
    render() {
        var _a;
        if (!this.shadowRoot || !this._config || !this._hass) {
            return;
        }
        const deviceSuffix = this._config.device;
        const maxEntityId = this.findEntityId(`${deviceSuffix}_max_services`) ||
            this.findEntityId('max_services');
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
                scheduled: this.getEntityState(scheduledId) || '-',
                destination,
                estimated: this.getEntityState(estimatedId) || '-',
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
            : ''}
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
                .join('')}
              </div>
            `
            : `<div class="empty">No services available.</div>`}
      </ha-card>
    `;
    }
}
class UkRailCardEditor extends HTMLElement {
    constructor() {
        super();
        this._devicesLoaded = false;
        this._entitiesLoaded = false;
        this.attachShadow({ mode: 'open' });
    }
    setConfig(config) {
        this._config = { ...config };
        this.render();
    }
    set hass(hass) {
        this._hass = hass;
        void this.loadDevices();
        void this.loadEntities();
        this.render();
    }
    updateConfigValue(key, value) {
        if (!this._config) {
            return;
        }
        const nextConfig = { ...this._config };
        const trimmed = value.trim();
        if (key === 'title') {
            if (trimmed) {
                nextConfig.title = trimmed;
            }
            else {
                delete nextConfig.title;
            }
        }
        else if (key === 'device') {
            nextConfig.device = trimmed;
        }
        else if (key === 'device_id') {
            if (trimmed) {
                nextConfig.device_id = trimmed;
            }
            else {
                delete nextConfig.device_id;
            }
        }
        else {
            nextConfig[key] = value;
        }
        this._config = nextConfig;
        this.dispatchEvent(new CustomEvent('config-changed', {
            detail: { config: nextConfig },
            bubbles: true,
            composed: true,
        }));
    }
    async loadDevices() {
        var _a;
        if (this._devicesLoaded || !((_a = this._hass) === null || _a === void 0 ? void 0 : _a.callWS)) {
            return;
        }
        this._devicesLoaded = true;
        try {
            const devices = await this._hass.callWS({
                type: 'config/device_registry/list',
            });
            this._devices = devices.filter((device) => {
                var _a, _b;
                const manufacturer = ((_a = device.manufacturer) !== null && _a !== void 0 ? _a : '').toLowerCase();
                const model = ((_b = device.model) !== null && _b !== void 0 ? _b : '').toLowerCase();
                return manufacturer === 'rail2mqtt' && model === 'departure board';
            });
        }
        catch {
            this._devices = [];
        }
        this.render();
    }
    async loadEntities() {
        var _a;
        if (this._entitiesLoaded || !((_a = this._hass) === null || _a === void 0 ? void 0 : _a.callWS)) {
            return;
        }
        this._entitiesLoaded = true;
        try {
            this._entities = await this._hass.callWS({
                type: 'config/entity_registry/list',
            });
        }
        catch {
            this._entities = [];
        }
        this.render();
    }
    deriveDeviceSuffix(entityId) {
        var _a;
        const entityName = (_a = entityId.split('.')[1]) !== null && _a !== void 0 ? _a : '';
        if (entityName.endsWith('_max_services')) {
            return entityName.replace(/_max_services$/, '');
        }
        const match = entityName.match(/^(.*)_\d+_(scheduled_time|destination|estimated_time)$/);
        if (match) {
            return match[1];
        }
        return entityName;
    }
    pickEntityIdForDevice(deviceId) {
        var _a;
        const entities = ((_a = this._entities) !== null && _a !== void 0 ? _a : []).filter((entity) => entity.device_id === deviceId);
        const entityIds = entities.map((entity) => entity.entity_id);
        const maxServices = entityIds.find((entityId) => { var _a; return ((_a = entityId.split('.')[1]) !== null && _a !== void 0 ? _a : '').endsWith('_max_services'); });
        if (maxServices) {
            return maxServices;
        }
        const matching = entityIds.find((entityId) => {
            var _a;
            return /^(.*)_\d+_(scheduled_time|destination|estimated_time)$/.test((_a = entityId.split('.')[1]) !== null && _a !== void 0 ? _a : '');
        });
        return matching !== null && matching !== void 0 ? matching : entityIds[0];
    }
    updateDeviceFromDevice(deviceId) {
        if (!this._config) {
            return;
        }
        const trimmed = deviceId.trim();
        if (trimmed && !this._entitiesLoaded) {
            void this.loadEntities().then(() => this.updateDeviceFromDevice(trimmed));
            return;
        }
        const nextConfig = { ...this._config };
        if (trimmed) {
            nextConfig.device_id = trimmed;
            const entityId = this.pickEntityIdForDevice(trimmed);
            nextConfig.device = entityId ? this.deriveDeviceSuffix(entityId) : '';
        }
        else {
            delete nextConfig.device_id;
            nextConfig.device = '';
        }
        this._config = nextConfig;
        this.dispatchEvent(new CustomEvent('config-changed', {
            detail: { config: nextConfig },
            bubbles: true,
            composed: true,
        }));
    }
    render() {
        var _a, _b;
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
        <ha-device-picker
          label="Device"
          helper="Select a rail2mqtt Departure Board device."
          persistent-helper
          data-field="device_id"
        ></ha-device-picker>
      </div>
    `;
        this.shadowRoot.querySelectorAll('ha-textfield').forEach((field) => {
            var _a, _b, _c;
            const input = field;
            const key = (_a = input.dataset) === null || _a === void 0 ? void 0 : _a.field;
            if (key === 'title') {
                input.value = (_c = (_b = this._config) === null || _b === void 0 ? void 0 : _b.title) !== null && _c !== void 0 ? _c : '';
            }
            field.addEventListener('input', (event) => {
                var _a, _b;
                const target = event.target;
                const key = (_a = target.dataset) === null || _a === void 0 ? void 0 : _a.field;
                const value = (_b = target.value) !== null && _b !== void 0 ? _b : '';
                if (!key) {
                    return;
                }
                this.updateConfigValue(key, value);
            });
        });
        const picker = this.shadowRoot.querySelector('ha-device-picker');
        if (picker) {
            picker.hass = this._hass;
            picker.devices = this._devices;
            picker.value = (_b = (_a = this._config) === null || _a === void 0 ? void 0 : _a.device_id) !== null && _b !== void 0 ? _b : '';
            picker.addEventListener('value-changed', (event) => {
                var _a;
                const detail = event.detail;
                this.updateDeviceFromDevice((_a = detail.value) !== null && _a !== void 0 ? _a : '');
            });
        }
    }
}
customElements.define('uk-rail-card', UkRailCard);
customElements.define('uk-rail-card-editor', UkRailCardEditor);
window.customCards =
    window.customCards ||
        [];
(_a = window.customCards) === null || _a === void 0 ? void 0 : _a.push({
    type: 'uk-rail-card',
    name: 'UK Rail Card',
    description: 'Displays upcoming rail services with scheduled and estimated times.',
});
//# sourceMappingURL=uk-rail-card.js.map
