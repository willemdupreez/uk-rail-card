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
device: rail_station
```

### Required

- `device`: suffix used to find entity IDs.

### Optional

- `title`: card title shown in the header.
- `device_entity`: optional entity used by the visual editor to derive the device suffix.

## Entity naming

The card looks for entities that end with these suffixes:

- `${device}_max_services`
- `${device}_<index>_scheduled_time`
- `${device}_<index>_destination`
- `${device}_<index>_estimated_time`

If a `destination` value is blank, the card stops rendering further rows.

## Development

```bash
npm install
npm run build
```

To bump the version and build in one step:

```bash
./bin/bump-version-build.sh [patch|minor|major]
```
