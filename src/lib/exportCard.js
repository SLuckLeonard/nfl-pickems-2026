import { toPng } from 'html-to-image';
import TEAM_LOGOS from '../data/logos.js';

/**
 * Preload every team logo so html-to-image can inline them on the first render.
 * ESPN's CDN sends `Access-Control-Allow-Origin: *`, so the images don't taint
 * the canvas. Call once when the Share page mounts.
 */
export function preloadLogos() {
  return Promise.all(
    Object.values(TEAM_LOGOS).map(
      (url) =>
        new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = resolve;
          img.onerror = resolve;
          img.src = url;
        })
    )
  );
}

/**
 * Render a DOM node to a PNG data URL. The first html-to-image pass often comes
 * back before late resources (webfonts, CDN images) settle, so we render twice
 * and keep the second result.
 *
 * @param {HTMLElement} node
 * @param {number} scale  device-pixel multiplier for the output image
 * @returns {Promise<string>} PNG data URL
 */
export async function cardToPng(node, scale = 2) {
  if (!node) throw new Error('No node to export');
  if (document.fonts?.ready) {
    try { await document.fonts.ready; } catch { /* non-fatal */ }
  }

  const opts = {
    pixelRatio: scale,
    cacheBust: true,
    backgroundColor: '#ffffff',
    // Render at the node's real layout size regardless of page zoom.
    width: node.offsetWidth,
    height: node.offsetHeight,
  };

  await toPng(node, opts);        // warm-up pass
  return toPng(node, opts);       // real pass
}

/**
 * Export a node to PNG and trigger a download.
 * @param {HTMLElement} node
 * @param {string} filename
 */
export async function downloadCardPng(node, filename) {
  const dataUrl = await cardToPng(node);
  const link = document.createElement('a');
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  link.href = dataUrl;
  link.click();
}

/** Slugify a string for use in a filename. */
export function slug(str) {
  return String(str || '')
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'card';
}
