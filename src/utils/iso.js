import { TILE_H, TILE_W } from "../constants.js";

export function isoToScreen(tileX, tileY) {
  return {
    x: (tileX - tileY) * (TILE_W / 2),
    y: (tileX + tileY) * (TILE_H / 2)
  };
}

export function screenToIso(screenX, screenY) {
  return {
    x: Math.round((screenX / (TILE_W / 2) + screenY / (TILE_H / 2)) / 2),
    y: Math.round((screenY / (TILE_H / 2) - screenX / (TILE_W / 2)) / 2)
  };
}
