# UK Rail Card

Custom Lovelace card that renders a rail departures board from Home Assistant entities.

## Installation (HACS)

1. Add this repository as a custom repository in HACS.
2. Install the card.
3. Add the resource in Home Assistant:

```yaml
resources:
  - url: /hacsfiles/uk-rail-card/uk-rail-card.js
    type: module
```

## Configuration

```yaml
type: custom:uk-rail-card
title: London Departures
device_id: 1234567890abcdef
```

### Required

- `device_id`: device selected in the editor; entity lookups are limited to this
  device.

### Optional

- `title`: card title shown in the header.

## Entity naming

The card looks for entities on the selected device that end with these suffixes:

- `*_max_services`
- `*_<index>_scheduled_time`
- `*_<index>_destination`
- `*_<index>_estimated_time`

If a `destination` value is blank, the card stops rendering further rows.

## Visibility

Home Assistant visibility conditions are configured on the dashboard, not inside
the card. If you want the card to show only when the rail2mqtt polling entity is
active, wrap it in a conditional card:

```yaml
type: conditional
conditions:
  - entity: sensor.rail_station_polling_active
    state: "on"
card:
  type: custom:uk-rail-card
  title: London Departures
  device_id: 1234567890abcdef
```

## Development

```bash
npm install
npm run build
```

To bump the version and build in one step:

```bash
./bin/bump-version-build.sh [patch|minor|major]
```
