/**
 * useGreenAnalyzer.js
 * Custom hook: wraps the Python FastAPI Green Space Analyzer endpoints.
 *
 * Exposes:
 *   analyzeRegion(geojson, regionName) → runs NDVI pipeline with SSE streaming
 *   searchRegion(query)                → geocodes a city name
 *   result, loading, error, progress, reset
 */
import { useState, useCallback } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_ANALYZER_API_URL || 'http://localhost:8000';

export function useGreenAnalyzer() {
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [progress, setProgress] = useState(null);

  /** GET /api/analyze/stream via SSE */
  const analyzeRegion = useCallback((geojson, regionName = 'Selected Region') => {
    return new Promise((resolve) => {
      setLoading(true);
      setError(null);
      setResult(null);
      setProgress({ step: 1, total: 5, message: 'Initiating analysis stream...' });

      // Encode parameters for SSE GET request
      const qGeo = encodeURIComponent(JSON.stringify(geojson));
      const qName = encodeURIComponent(regionName);
      const url = `${API_BASE}/api/analyze/stream?geojson=${qGeo}&region_name=${qName}`;

      const source = new EventSource(url);

      source.addEventListener('progress', (e) => {
        try {
          setProgress(JSON.parse(e.data));
        } catch (err) {}
      });

      source.addEventListener('result', (e) => {
        try {
          const data = JSON.parse(e.data);
          setResult(data);
          resolve(data);
        } catch (err) {
          setError('Failed to parse analysis result.');
          resolve(null);
        } finally {
          setLoading(false);
          setProgress(null);
          source.close();
        }
      });

      source.addEventListener('error', (e) => {
        // Named 'error' SSE event sent by the server contains JSON data
        let msg = 'Analysis failed on the server.';
        if (e.data) {
          try {
            const data = JSON.parse(e.data);
            if (data.message) msg = data.message;
          } catch (err) {}
        }
        setError(msg);
        setLoading(false);
        setProgress(null);
        source.close();
        resolve(null);
      });

      // Native EventSource onerror (connection dropped / CORS / server down)
      source.onerror = (e) => {
        // Only act if we haven't already resolved via the named 'error' event
        if (source.readyState === EventSource.CLOSED) return;
        setError(
          'Could not connect to the analyzer service. ' +
          'Make sure the Python FastAPI server is running on port 8000.'
        );
        setLoading(false);
        setProgress(null);
        source.close();
        resolve(null);
      };
    });
  }, []);

  /** GET /api/search-region?q=... */
  const searchRegion = useCallback(async (query) => {
    if (!query || query.trim().length < 2) return null;
    try {
      const { data } = await axios.get(`${API_BASE}/api/search-region`, {
        params: { q: query.trim() },
        timeout: 15_000,
      });
      return data; // GeoJSON Feature
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        `Region "${query}" not found.`;
      setError(msg);
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setLoading(false);
    setProgress(null);
  }, []);

  return { result, loading, error, progress, analyzeRegion, searchRegion, reset };
}
