// src/components/HeatmapLayer.tsx
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import 'leaflet.heat';
import L from 'leaflet';

// Define the type for a single point
type HeatmapPoint = [number, number, number]; // [lat, lng, intensity]

interface HeatmapLayerProps {
  points: HeatmapPoint[];
  radius?: number;
}

const HeatmapLayer = ({ points, radius = 20 }: HeatmapLayerProps) => {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) {
      return;
    }

    const heatLayer = (L as any).heatLayer(points, { radius }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points, radius]);

  return null; // This component does not render anything itself
};

export default HeatmapLayer;