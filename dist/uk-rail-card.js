var _a;
const version = '0.2.38';
console.info('%c UK-RAIL-CARD %c v'.concat(version, ' '), 'color: white; background: navy; font-weight: 700;', 'color: navy; background: white; font-weight: 700;');
class UkRailCard extends HTMLElement {
    constructor() {
        super();
        this._entityRegistryLoaded = false;
        this._deviceRegistryLoaded = false;
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
        void this.loadEntityRegistry();
        void this.loadDeviceRegistry();
        this.render();
    }
    set hass(hass) {
        this._hass = hass;
        void this.loadEntityRegistry();
        void this.loadDeviceRegistry();
        this.render();
    }
    getCardSize() {
        return 3;
    }
    async loadEntityRegistry() {
        var _a, _b;
        if (this._entityRegistryLoaded ||
            !((_a = this._hass) === null || _a === void 0 ? void 0 : _a.callWS) ||
            !((_b = this._config) === null || _b === void 0 ? void 0 : _b.device_id)) {
            return;
        }
        this._entityRegistryLoaded = true;
        try {
            this._entityRegistry = await this._hass.callWS({
                type: 'config/entity_registry/list',
            });
        }
        catch {
            this._entityRegistry = [];
        }
        this.render();
    }
    async loadDeviceRegistry() {
        var _a, _b;
        if (this._deviceRegistryLoaded ||
            !((_a = this._hass) === null || _a === void 0 ? void 0 : _a.callWS) ||
            !((_b = this._config) === null || _b === void 0 ? void 0 : _b.device_id)) {
            return;
        }
        this._deviceRegistryLoaded = true;
        try {
            this._deviceRegistry = await this._hass.callWS({
                type: 'config/device_registry/list',
            });
        }
        catch {
            this._deviceRegistry = [];
        }
        this.render();
    }
    getDeviceName() {
        var _a, _b;
        const deviceId = (_a = this._config) === null || _a === void 0 ? void 0 : _a.device_id;
        if (!deviceId) {
            return undefined;
        }
        if (!this._deviceRegistryLoaded) {
            void this.loadDeviceRegistry();
            return undefined;
        }
        const device = ((_b = this._deviceRegistry) !== null && _b !== void 0 ? _b : []).find((entry) => entry.id === deviceId);
        const name = (device === null || device === void 0 ? void 0 : device.name_by_user) || (device === null || device === void 0 ? void 0 : device.name) || '';
        if (!name) {
            return undefined;
        }
        return name.replace(/^Rail departure board:\s*/i, '').trim();
    }
    findEntityId(suffix) {
        var _a, _b;
        if (!this._hass) {
            return undefined;
        }
        const entityIds = Object.keys(this._hass.states);
        if ((_a = this._config) === null || _a === void 0 ? void 0 : _a.device_id) {
            if (!this._entityRegistryLoaded) {
                void this.loadEntityRegistry();
                return undefined;
            }
            const deviceEntities = ((_b = this._entityRegistry) !== null && _b !== void 0 ? _b : []).filter((entity) => { var _a; return entity.device_id === ((_a = this._config) === null || _a === void 0 ? void 0 : _a.device_id); });
            const deviceEntityIds = deviceEntities.map((entity) => entity.entity_id);
            const scopedIds = entityIds.filter((entityId) => deviceEntityIds.includes(entityId));
            return scopedIds.find((entityId) => entityId.endsWith(suffix));
        }
        return entityIds.find((entityId) => entityId.endsWith(suffix));
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
        const lastUpdatedEntityId = this.findEntityId(`${deviceSuffix}_last_updated`) ||
            this.findEntityId('last_updated');
        const lastUpdated = this.getEntityState(lastUpdatedEntityId);
        const lastUpdatedDate = lastUpdated ? new Date(lastUpdated) : null;
        const lastUpdatedIso = lastUpdatedDate && !Number.isNaN(lastUpdatedDate.getTime())
            ? lastUpdatedDate.toISOString()
            : '';
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
        const title = ((_a = this._config.title) === null || _a === void 0 ? void 0 : _a.trim()) || this.getDeviceName();
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
        ${title
            ? `
              <div class="header">
                <div class="title">${title}</div>
                ${lastUpdatedIso
                ? `<div class="status"><ha-relative-time></ha-relative-time></div>`
                : ''}
              </div>
            `
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
        if (lastUpdatedIso) {
            const relativeTime = this.shadowRoot.querySelector('ha-relative-time');
            if (relativeTime) {
                relativeTime.hass = this._hass;
                relativeTime.datetime = lastUpdatedIso;
            }
        }
    }
}
class UkRailCardEditor extends HTMLElement {
    constructor() {
        super();
        this._entitiesLoaded = false;
        this.attachShadow({ mode: 'open' });
    }
    setConfig(config) {
        this._config = { ...config };
        this.render();
    }
    set hass(hass) {
        this._hass = hass;
        void this.loadEntities();
        this.render();
    }
    updateConfigValue(key, value) {
        if (!this._config) {
            return;
        }
        const nextConfig = { ...this._config };
        if (key === 'title') {
            if (value) {
                nextConfig.title = value;
            }
            else {
                delete nextConfig.title;
            }
        }
        else if (key === 'device') {
            const trimmed = value.trim();
            nextConfig.device = trimmed;
        }
        else if (key === 'device_id') {
            const trimmed = value.trim();
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
    }
    updateFormData(form) {
        var _a, _b, _c, _d;
        const nextData = {
            title: (_b = (_a = this._config) === null || _a === void 0 ? void 0 : _a.title) !== null && _b !== void 0 ? _b : '',
            device_id: (_d = (_c = this._config) === null || _c === void 0 ? void 0 : _c.device_id) !== null && _d !== void 0 ? _d : '',
        };
        const current = form.data;
        if ((current === null || current === void 0 ? void 0 : current.title) === nextData.title &&
            (current === null || current === void 0 ? void 0 : current.device_id) === nextData.device_id) {
            return;
        }
        form.data = nextData;
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
        if (!this.shadowRoot) {
            return;
        }
        const form = this.shadowRoot.querySelector('ha-form');
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
        const resolvedForm = this.shadowRoot.querySelector('ha-form');
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
        resolvedForm.computeLabel = (schema) => {
            if (schema.name === 'title') {
                return 'Title (optional)';
            }
            return 'Device';
        };
        resolvedForm.computeHelper = (schema) => {
            if (schema.name === 'device_id') {
                return 'Select a rail2mqtt Departure Board device.';
            }
            return '';
        };
        if (!resolvedForm.hasAttribute('data-listener')) {
            resolvedForm.setAttribute('data-listener', 'true');
            resolvedForm.addEventListener('value-changed', (event) => {
                var _a, _b, _c, _d, _e, _f, _g;
                const detail = event.detail;
                const value = (_a = detail.value) !== null && _a !== void 0 ? _a : {};
                if (value.title !== ((_c = (_b = this._config) === null || _b === void 0 ? void 0 : _b.title) !== null && _c !== void 0 ? _c : '')) {
                    this.updateConfigValue('title', (_d = value.title) !== null && _d !== void 0 ? _d : '');
                }
                if (value.device_id !== ((_f = (_e = this._config) === null || _e === void 0 ? void 0 : _e.device_id) !== null && _f !== void 0 ? _f : '')) {
                    this.updateDeviceFromDevice((_g = value.device_id) !== null && _g !== void 0 ? _g : '');
                }
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
