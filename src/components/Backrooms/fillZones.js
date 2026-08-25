export const fillZoneStops = [
  { label: "stop-1", x: -11.306, z: 5.554 },
  { label: "stop-2", x: -2.216, z: -10.286 },
  { label: "stop-3", x: -9.124, z: -11.577 },
  { label: "stop-4", x: -10.312, z: -6.429 },
  { label: "stop-5", x: -4.523, z: -10.452 },
  { label: "stop-6", x: 4.045, z: -7.628 },
];

export function buildFillZones(lighting) {
  if (!lighting.fillZones) {
    return [];
  }

  const brighten = lighting.zoneBrighten ?? 2.65;
  const radius = lighting.zoneRadius ?? 8;

  return fillZoneStops.map((stop) => ({
    ...stop,
    radius,
    brighten,
  }));
}
