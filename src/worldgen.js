// Biome blending plus city, suburb and snow-realm structures.

import {
  BIOME_ANCHORS,
  BIOME_CELL,
  BIOME_EDGE,
  BIOME_TYPES,
  BLOCKS,
  MEADOW_WEIGHT,
  CITY_PLAN,
  SNOW_REALM,
  SUBURB_PLAN,
  WATER_LEVEL,
} from "./constants.js";
import { clamp, hash3, isInsideRect, perlin2 } from "./math.js";
export function getCityCenter() {
  return {
    x: (CITY_PLAN.minX + CITY_PLAN.maxX) * 0.5,
    z: (CITY_PLAN.minZ + CITY_PLAN.maxZ) * 0.5,
  };
}

export function getCityTargetHeight(wx, wz) {
  return CITY_PLAN.baseHeight + Math.round(perlin2(wx / 28 + 17, wz / 28 + 23) * 0.7);
}

export function getSnowCenter() {
  return {
    x: (SNOW_REALM.minX + SNOW_REALM.maxX) * 0.5,
    z: (SNOW_REALM.minZ + SNOW_REALM.maxZ) * 0.5,
  };
}

export function getSnowTargetHeight(wx, wz) {
  const ridge = Math.abs(perlin2(wx / 32 + 9, wz / 32 + 27)) * 2.8;
  const detail = perlin2(wx / 18 + 3, wz / 18 + 8) * 1.6;
  return SNOW_REALM.baseHeight + Math.round(ridge + detail);
}

export function getSnowBlend(wx, wz) {
  return isInsideRect(wx, wz, SNOW_REALM) ? 0.92 : 0;
}

export function getSettlementBlend(wx, wz) {
  if (isInsideRect(wx, wz, CITY_PLAN)) {
    return 0.96;
  }
  if (isInsideRect(wx, wz, SUBURB_PLAN)) {
    return 0.58;
  }
  return 0;
}

export function getSnowParcel(wx, wz) {
  if (!isInsideRect(wx, wz, SNOW_REALM)) {
    return null;
  }

  const relX = wx - SNOW_REALM.minX;
  const relZ = wz - SNOW_REALM.minZ;
  const spacing = SNOW_REALM.pathSpacing;
  const pathWidth = SNOW_REALM.pathWidth;
  const modX = ((relX % spacing) + spacing) % spacing;
  const modZ = ((relZ % spacing) + spacing) % spacing;
  const pathX = modX < pathWidth;
  const pathZ = modZ < pathWidth;
  const lotX = Math.floor(relX / spacing);
  const lotZ = Math.floor(relZ / spacing);

  if (pathX || pathZ) {
    return {
      kind: "path",
      lotX,
      lotZ,
      modX,
      modZ,
      isIntersection: pathX && pathZ,
    };
  }

  const innerX = modX - pathWidth;
  const innerZ = modZ - pathWidth;
  const seed = hash3(lotX, 211, lotZ);
  const style = seed > 0.74 ? "lodge" : seed > 0.42 ? "hall" : "igloo";
  const width = style === "igloo" ? 7 : style === "hall" ? 8 : 6;
  const depth = style === "igloo" ? 7 : style === "hall" ? 7 : 6;
  const offsetX = 2;
  const offsetZ = style === "hall" ? 3 : 2;
  const footprint =
    innerX >= offsetX &&
    innerX < offsetX + width &&
    innerZ >= offsetZ &&
    innerZ < offsetZ + depth;

  return {
    kind: "lot",
    lotX,
    lotZ,
    innerX,
    innerZ,
    style,
    width,
    depth,
    offsetX,
    offsetZ,
    footprint,
  };
}

export function getCityParcel(wx, wz) {
  if (!isInsideRect(wx, wz, CITY_PLAN)) {
    return null;
  }

  const relX = wx - CITY_PLAN.minX;
  const relZ = wz - CITY_PLAN.minZ;
  const spacing = CITY_PLAN.roadSpacing;
  const roadWidth = CITY_PLAN.roadWidth;
  const modX = ((relX % spacing) + spacing) % spacing;
  const modZ = ((relZ % spacing) + spacing) % spacing;
  const roadX = modX < roadWidth;
  const roadZ = modZ < roadWidth;
  const blockX = Math.floor(relX / spacing);
  const blockZ = Math.floor(relZ / spacing);

  if (roadX || roadZ) {
    return {
      kind: "road",
      blockX,
      blockZ,
      relX,
      relZ,
      modX,
      modZ,
      isIntersection: roadX && roadZ,
    };
  }

  const innerX = modX - roadWidth;
  const innerZ = modZ - roadWidth;
  const lotSeed = hash3(blockX, 143, blockZ);
  const style = lotSeed > 0.84
    ? "tower"
    : lotSeed > 0.62
      ? "stepped_tower"
      : lotSeed > 0.42
        ? "townhouse"
        : lotSeed > 0.22
          ? "shop"
          : "house";
  const width = style === "tower" || style === "stepped_tower"
    ? 6 + Math.floor(hash3(blockX, 144, blockZ) * 2)
    : style === "shop"
      ? 7
      : 5 + Math.floor(hash3(blockX, 145, blockZ) * 2);
  const depth = style === "house"
    ? 5 + Math.floor(hash3(blockX, 146, blockZ) * 2)
    : style === "shop"
      ? 6
      : 6 + Math.floor(hash3(blockX, 147, blockZ) * 2);
  const offsetX = 1 + Math.floor(hash3(blockX, 148, blockZ) * Math.max(1, 9 - width - 1));
  const offsetZ = 1 + Math.floor(hash3(blockX, 149, blockZ) * Math.max(1, 9 - depth - 1));
  const stories = style === "tower" || style === "stepped_tower"
    ? 3 + Math.floor(hash3(blockX, 150, blockZ) * 4)
    : style === "townhouse" || style === "shop"
      ? 2 + Math.floor(hash3(blockX, 151, blockZ) * 2)
      : 1 + Math.floor(hash3(blockX, 152, blockZ) * 2);
  const doorSideIndex = Math.floor(hash3(blockX, 153, blockZ) * 4);
  const doorSide = ["north", "east", "south", "west"][doorSideIndex];
  const footprint =
    innerX >= offsetX &&
    innerX < offsetX + width &&
    innerZ >= offsetZ &&
    innerZ < offsetZ + depth;
  const roofStyle = hash3(blockX, 154, blockZ) > 0.5 ? "flat" : "crown";
  const trimColor = hash3(blockX, 155, blockZ);

  return {
    kind: "lot",
    blockX,
    blockZ,
    innerX,
    innerZ,
    footprint,
    style,
    width,
    depth,
    offsetX,
    offsetZ,
    stories,
    lotSeed,
    doorSide,
    roofStyle,
    trimColor,
  };
}

export function getSuburbParcel(wx, wz) {
  if (isInsideRect(wx, wz, CITY_PLAN) || !isInsideRect(wx, wz, SUBURB_PLAN)) {
    return null;
  }
  const spacing = 14;
  const relX = wx - SUBURB_PLAN.minX;
  const relZ = wz - SUBURB_PLAN.minZ;
  const cellX = Math.floor(relX / spacing);
  const cellZ = Math.floor(relZ / spacing);
  const localX = ((relX % spacing) + spacing) % spacing;
  const localZ = ((relZ % spacing) + spacing) % spacing;
  const cellSeed = hash3(cellX, 181, cellZ);
  if (cellSeed < 0.56) {
    return null;
  }
  const width = 5 + Math.floor(hash3(cellX, 182, cellZ) * 2);
  const depth = 5 + Math.floor(hash3(cellX, 183, cellZ) * 2);
  const offsetX = 3 + Math.floor(hash3(cellX, 184, cellZ) * 2);
  const offsetZ = 3 + Math.floor(hash3(cellX, 185, cellZ) * 2);
  const footprint =
    localX >= offsetX &&
    localX < offsetX + width &&
    localZ >= offsetZ &&
    localZ < offsetZ + depth;
  return {
    kind: "suburb",
    localX,
    localZ,
    footprint,
    width,
    depth,
    offsetX,
    offsetZ,
    stories: 1 + Math.floor(hash3(cellX, 186, cellZ) * 2),
    doorSide: hash3(cellX, 187, cellZ) > 0.5 ? "south" : "west",
  };
}

export function getStructureBlock(wx, wy, wz, height) {
  const cityParcel = getCityParcel(wx, wz);
  const cityFloor = getCityTargetHeight(wx, wz);
  if (cityParcel) {
    if (cityParcel.kind === "road") {
      if (wy === cityFloor || wy === cityFloor - 1) {
        return cityParcel.isIntersection || cityParcel.modX === CITY_PLAN.roadWidth - 1 || cityParcel.modZ === CITY_PLAN.roadWidth - 1
          ? BLOCKS.bricks
          : BLOCKS.stone;
      }
      const lampSpot =
        cityParcel.modX === 1 &&
        cityParcel.modZ === 1 &&
        ((cityParcel.blockX + cityParcel.blockZ) % 2 === 0);
      if (lampSpot) {
        if (wy > cityFloor && wy <= cityFloor + 3) {
          return BLOCKS.wood;
        }
        if (wy === cityFloor + 4 || wy === cityFloor + 5) {
          return BLOCKS.glass;
        }
      }
      return null;
    }

    const parcel = cityParcel;
    const relX = parcel.innerX - parcel.offsetX;
    const relZ = parcel.innerZ - parcel.offsetZ;
    const withinFootprint = parcel.footprint;
    const foundationY = cityFloor;
    const baseY = foundationY + 1;
    const wallHeight = parcel.style === "tower" || parcel.style === "stepped_tower" ? parcel.stories * 3 + 1 : parcel.stories * 3;
    const roofY = baseY + wallHeight;
    const isEdge =
      relX === 0 ||
      relZ === 0 ||
      relX === parcel.width - 1 ||
      relZ === parcel.depth - 1;
    const windowBand = parcel.style === "tower" || parcel.style === "stepped_tower"
      ? wy > baseY && wy < roofY && ((wy - baseY) % 2 === 1)
      : wy === baseY + 1 || (parcel.style !== "house" && wy === baseY + 4);
    const centerX = Math.floor(parcel.width / 2);
    const centerZ = Math.floor(parcel.depth / 2);
    const onDoor =
      (parcel.doorSide === "north" && relZ === 0 && relX === centerX) ||
      (parcel.doorSide === "south" && relZ === parcel.depth - 1 && relX === centerX) ||
      (parcel.doorSide === "west" && relX === 0 && relZ === centerZ) ||
      (parcel.doorSide === "east" && relX === parcel.width - 1 && relZ === centerZ);
    const onWindow = isEdge && windowBand && !onDoor && ((relX + relZ + wy) % 2 === 0);
    const wallBlock =
      parcel.style === "tower" || parcel.style === "stepped_tower"
        ? BLOCKS.bricks
        : parcel.style === "townhouse" || parcel.style === "shop"
          ? BLOCKS.planks
          : BLOCKS.wood;
    const trimBlock = parcel.trimColor > 0.55 ? BLOCKS.stone : BLOCKS.wood;
    const roofBlock = parcel.style === "house" || parcel.style === "shop" ? BLOCKS.planks : BLOCKS.bricks;
    const floorIndex = Math.floor((wy - baseY) / 3);
    const recessedTop =
      parcel.style === "stepped_tower" &&
      floorIndex >= Math.max(1, parcel.stories - 2) &&
      relX >= 1 &&
      relX <= parcel.width - 2 &&
      relZ >= 1 &&
      relZ <= parcel.depth - 2;
    const balconyRing =
      parcel.style === "tower" &&
      floorIndex > 0 &&
      floorIndex < parcel.stories - 1 &&
      (floorIndex % 2 === 0) &&
      (relX === 0 || relX === parcel.width - 1 || relZ === 0 || relZ === parcel.depth - 1);
    const shopAwning =
      parcel.style === "shop" &&
      wy === baseY + 2 &&
      ((parcel.doorSide === "south" && relZ === parcel.depth - 1 && relX > 0 && relX < parcel.width - 1) ||
        (parcel.doorSide === "north" && relZ === 0 && relX > 0 && relX < parcel.width - 1));
    const shopFrontGlass =
      parcel.style === "shop" &&
      wy >= baseY &&
      wy <= baseY + 1 &&
      ((parcel.doorSide === "south" && relZ === parcel.depth - 1 && relX > 0 && relX < parcel.width - 1) ||
        (parcel.doorSide === "north" && relZ === 0 && relX > 0 && relX < parcel.width - 1));

    if (!withinFootprint) {
      if (wy === foundationY && ((parcel.innerX + parcel.innerZ) % 7 === 0)) {
        return BLOCKS.planks;
      }
      return null;
    }
    if (wy === foundationY || wy === foundationY - 1) {
      return parcel.style === "tower" || parcel.style === "stepped_tower" ? BLOCKS.stone : BLOCKS.bricks;
    }
    if (wy >= baseY && wy < roofY) {
      if (recessedTop && !isEdge) {
        return BLOCKS.air;
      }
      if (isEdge) {
        if (onDoor && wy <= baseY + 1) {
          return BLOCKS.air;
        }
        if (shopFrontGlass) {
          return BLOCKS.glass;
        }
        if (onWindow) {
          return BLOCKS.glass;
        }
        if (shopAwning) {
          return BLOCKS.planks;
        }
        if (balconyRing && wy === baseY + floorIndex * 3 + 1) {
          return trimBlock;
        }
        if ((parcel.style === "townhouse" || parcel.style === "shop") && wy === baseY + 2 && ((relX + relZ) % 3 === 0)) {
          return trimBlock;
        }
        return wallBlock;
      }
      if (parcel.style === "shop" && wy === baseY + 2 && relZ === parcel.depth - 2 && relX > 1 && relX < parcel.width - 2) {
        return BLOCKS.air;
      }
      return BLOCKS.air;
    }
    if (wy === roofY) {
      if (parcel.style === "house") {
        const roofInset = Math.min(relX, relZ, parcel.width - 1 - relX, parcel.depth - 1 - relZ);
        return roofInset <= 1 ? BLOCKS.planks : BLOCKS.air;
      }
      if (parcel.style === "shop") {
        return trimBlock;
      }
      return roofBlock;
    }
    if ((parcel.style === "tower" || parcel.style === "stepped_tower") && wy === roofY + 1 && isEdge) {
      return trimBlock;
    }
    if ((parcel.style === "tower" || parcel.style === "stepped_tower") && parcel.roofStyle === "crown" && wy === roofY + 2) {
      const roofInset = Math.min(relX, relZ, parcel.width - 1 - relX, parcel.depth - 1 - relZ);
      return roofInset === 1 ? BLOCKS.glass : BLOCKS.air;
    }
    return null;
  }

  const suburbParcel = getSuburbParcel(wx, wz);
  if (!suburbParcel) {
    return null;
  }

  const suburbFloor = getCityTargetHeight(wx, wz);
  const relX = suburbParcel.localX - suburbParcel.offsetX;
  const relZ = suburbParcel.localZ - suburbParcel.offsetZ;
  const isEdge =
    relX === 0 ||
    relZ === 0 ||
    relX === suburbParcel.width - 1 ||
    relZ === suburbParcel.depth - 1;
  const centerX = Math.floor(suburbParcel.width / 2);
  const centerZ = Math.floor(suburbParcel.depth / 2);
  const onDoor =
    (suburbParcel.doorSide === "south" && relZ === suburbParcel.depth - 1 && relX === centerX) ||
    (suburbParcel.doorSide === "west" && relX === 0 && relZ === centerZ);

  if (!suburbParcel.footprint) {
    return null;
  }
  if (wy === suburbFloor || wy === suburbFloor - 1) {
    return BLOCKS.stone;
  }
  const baseY = suburbFloor + 1;
  const wallHeight = suburbParcel.stories * 3;
  if (wy >= baseY && wy < baseY + wallHeight) {
    if (isEdge) {
      if (onDoor && wy <= baseY + 1) {
        return BLOCKS.air;
      }
      if ((wy === baseY + 1 || wy === baseY + 4) && ((relX + relZ) % 2 === 0) && !onDoor) {
        return BLOCKS.glass;
      }
      return BLOCKS.planks;
    }
    return BLOCKS.air;
  }
  if (wy === baseY + wallHeight) {
    return BLOCKS.wood;
  }

  const snowParcel = getSnowParcel(wx, wz);
  if (!snowParcel) {
    return null;
  }

  const snowFloor = getSnowTargetHeight(wx, wz);
  if (snowParcel.kind === "path") {
    if (wy === snowFloor) {
      return snowParcel.isIntersection || snowParcel.modX === SNOW_REALM.pathWidth - 1 || snowParcel.modZ === SNOW_REALM.pathWidth - 1
        ? BLOCKS.pine_wood
        : BLOCKS.ice;
    }
    if (wy === snowFloor - 1) {
      return BLOCKS.snow;
    }
    const beaconSpot =
      snowParcel.modX === 1 &&
      snowParcel.modZ === 1 &&
      ((snowParcel.lotX + snowParcel.lotZ) % 2 === 0);
    if (beaconSpot) {
      if (wy > snowFloor && wy <= snowFloor + 3) {
        return BLOCKS.pine_wood;
      }
      if (wy === snowFloor + 4 || wy === snowFloor + 5) {
        return BLOCKS.ice;
      }
    }
    return null;
  }

  if (!snowParcel.footprint) {
    return null;
  }

  const relSnowX = snowParcel.innerX - snowParcel.offsetX;
  const relSnowZ = snowParcel.innerZ - snowParcel.offsetZ;
  const snowCenterX = (snowParcel.width - 1) * 0.5;
  const snowCenterZ = (snowParcel.depth - 1) * 0.5;
  const radius = Math.max(Math.abs(relSnowX - snowCenterX), Math.abs(relSnowZ - snowCenterZ));
  const snowBaseY = snowFloor + 1;

  if (snowParcel.style === "igloo") {
    const domeRadius = 3.3;
    const domeHeight = Math.max(0, Math.floor(domeRadius * domeRadius - ((relSnowX - snowCenterX) ** 2 + (relSnowZ - snowCenterZ) ** 2)));
    const shellTop = snowBaseY + domeHeight;
    const shellBottom = snowBaseY;
    const doorway =
      relSnowZ === snowParcel.depth - 1 &&
      (relSnowX === Math.floor(snowCenterX) || relSnowX === Math.ceil(snowCenterX)) &&
      wy <= snowBaseY + 1;
    const windowBand = wy === snowBaseY + 2 && (relSnowX === 1 || relSnowX === snowParcel.width - 2);
    if (wy === snowFloor || wy === snowFloor - 1) {
      return BLOCKS.snow;
    }
    if (wy >= shellBottom && wy <= shellTop) {
      const shellThreshold = wy === shellTop ? 0 : 0.85;
      if (radius >= domeRadius - shellThreshold) {
        if (doorway) {
          return BLOCKS.air;
        }
        if (windowBand) {
          return BLOCKS.ice;
        }
        return BLOCKS.snow;
      }
      return BLOCKS.air;
    }
    return null;
  }

  const edge =
    relSnowX === 0 ||
    relSnowZ === 0 ||
    relSnowX === snowParcel.width - 1 ||
    relSnowZ === snowParcel.depth - 1;
  const snowWallHeight = snowParcel.style === "hall" ? 5 : 4;
  const roofY = snowBaseY + snowWallHeight;
  const door =
    relSnowZ === snowParcel.depth - 1 &&
    (relSnowX === Math.floor(snowCenterX) || relSnowX === Math.ceil(snowCenterX));

  if (wy === snowFloor || wy === snowFloor - 1) {
    return BLOCKS.stone;
  }
  if (wy >= snowBaseY && wy < roofY) {
    if (edge) {
      if (door && wy <= snowBaseY + 1) {
        return BLOCKS.air;
      }
      if ((wy === snowBaseY + 1 || wy === snowBaseY + 3) && !door && (relSnowX + relSnowZ) % 2 === 0) {
        return BLOCKS.ice;
      }
      return relSnowZ === 0 || relSnowZ === snowParcel.depth - 1 ? BLOCKS.pine_wood : BLOCKS.planks;
    }
    return BLOCKS.air;
  }
  if (wy === roofY) {
    const roofInset = Math.min(relSnowX, relSnowZ, snowParcel.width - 1 - relSnowX, snowParcel.depth - 1 - relSnowZ);
    if (snowParcel.style === "hall") {
      return roofInset <= 1 ? BLOCKS.snow : BLOCKS.ice;
    }
    return roofInset <= 1 ? BLOCKS.snow : BLOCKS.air;
  }
  if (snowParcel.style === "hall" && wy === roofY + 1 && edge) {
    return BLOCKS.pine_wood;
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Biome regions
 *
 * Each biome is a fixed rectangle with its own idea of how high the
 * ground should be and what it is made of. The strength fades over
 * BIOME_EDGE blocks at the border, so a desert runs out into meadow
 * rather than stopping at a wall.
 * ------------------------------------------------------------------ */

/** How thick the stone lid over the Ember Deep is, wherever its hill runs. */
const EMBER_LID = 4;

const BIOME_BY_ID = new Map(BIOME_TYPES.map((type) => [type.id, type]));

/** Total weight of the wheel, meadow included. */
const TOTAL_WEIGHT = BIOME_TYPES.reduce((sum, type) => sum + type.weight, 0) + MEADOW_WEIGHT;

/** What a grid cell grows. Null means ordinary meadow. */
function cellType(cellX, cellZ) {
  let roll = hash3(cellX * 0.37, 91, cellZ * 0.37) * TOTAL_WEIGHT;
  for (const type of BIOME_TYPES) {
    roll -= type.weight;
    if (roll < 0) {
      return type;
    }
  }
  return null;
}

/**
 * A site inside each cell, nudged off centre so borders come out irregular
 * rather than as a visible square grid.
 */
function cellSite(cellX, cellZ) {
  const jitterX = hash3(cellX * 0.53, 11, cellZ * 0.53);
  const jitterZ = hash3(cellX * 0.71, 23, cellZ * 0.71);
  return {
    x: (cellX + 0.15 + jitterX * 0.7) * BIOME_CELL,
    z: (cellZ + 0.15 + jitterZ * 0.7) * BIOME_CELL,
    type: cellType(cellX, cellZ),
  };
}

/** The anchor region covering a point, if any: the original five never move. */
function anchorAt(wx, wz) {
  for (const anchor of BIOME_ANCHORS) {
    if (wx >= anchor.minX && wx <= anchor.maxX && wz >= anchor.minZ && wz <= anchor.maxZ) {
      return anchor;
    }
  }
  return null;
}

/**
 * The biome at a column and how strongly it applies. Nearest site wins; the
 * strength fades towards whichever different-biome site is next nearest, so a
 * desert runs out into meadow rather than stopping at a wall.
 */
export function getBiomeAt(wx, wz) {
  // The city and the snow realm are landmarks and keep their own ground.
  if (getSettlementBlend(wx, wz) > 0 || getSnowBlend(wx, wz) > 0) {
    return null;
  }

  const anchor = anchorAt(wx, wz);
  if (anchor) {
    const region = BIOME_BY_ID.get(anchor.id);
    const inset = Math.min(
      wx - anchor.minX,
      anchor.maxX - wx,
      wz - anchor.minZ,
      anchor.maxZ - wz,
    );
    return {
      region,
      blend: clamp(inset / BIOME_EDGE, 0, 1) * region.strength,
      centerX: (anchor.minX + anchor.maxX) / 2,
      centerZ: (anchor.minZ + anchor.maxZ) / 2,
    };
  }

  const cellX = Math.floor(wx / BIOME_CELL);
  const cellZ = Math.floor(wz / BIOME_CELL);
  let nearest = null;
  let nearestDistance = Infinity;
  const sites = [];
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const site = cellSite(cellX + dx, cellZ + dz);
      site.distance = Math.hypot(wx - site.x, wz - site.z);
      sites.push(site);
      if (site.distance < nearestDistance) {
        nearestDistance = site.distance;
        nearest = site;
      }
    }
  }
  if (!nearest?.type) {
    return null;
  }

  // Fade towards the nearest site of a *different* biome, so two neighbouring
  // patches of the same kind do not leave a seam down the middle.
  let rivalDistance = Infinity;
  for (const site of sites) {
    if (site.type?.id !== nearest.type.id && site.distance < rivalDistance) {
      rivalDistance = site.distance;
    }
  }
  const margin = (rivalDistance - nearestDistance) * 0.5;
  const blend = clamp(margin / BIOME_EDGE, 0, 1) * nearest.type.strength;
  return blend > 0
    ? { region: nearest.type, blend, centerX: nearest.x, centerZ: nearest.z }
    : null;
}

/**
 * The nearest patch of one biome to a point, searched outward over cells. The
 * grid is coarse, so this stays cheap even a long way out.
 */
export function findNearestBiome(typeId, fromX, fromZ, maxRings = 40) {
  const anchor = BIOME_ANCHORS.find((entry) => entry.id === typeId);
  let best = anchor
    ? { x: (anchor.minX + anchor.maxX) / 2, z: (anchor.minZ + anchor.maxZ) / 2 }
    : null;
  let bestDistance = best ? Math.hypot(best.x - fromX, best.z - fromZ) : Infinity;

  const originX = Math.floor(fromX / BIOME_CELL);
  const originZ = Math.floor(fromZ / BIOME_CELL);
  for (let ring = 0; ring <= maxRings; ring++) {
    for (let dz = -ring; dz <= ring; dz++) {
      for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) {
          continue;
        }
        if (cellType(originX + dx, originZ + dz)?.id !== typeId) {
          continue;
        }
        const site = cellSite(originX + dx, originZ + dz);
        const distance = Math.hypot(site.x - fromX, site.z - fromZ);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = { x: site.x, z: site.z };
        }
      }
    }
    // One ring past the first hit is enough: anything further is further away.
    if (best && ring * BIOME_CELL > bestDistance + BIOME_CELL) {
      break;
    }
  }
  return best;
}

/** Distance 0..1 from the middle of a patch, for features that sit in the centre. */
function centreFalloff(biome, wx, wz, radius) {
  return clamp(1 - Math.hypot(wx - biome.centerX, wz - biome.centerZ) / radius, 0, 1);
}

/** The oasis: a green dip with water in the middle of the dunes. */
export function getOasisDepth(biome, wx, wz) {
  return centreFalloff(biome, wx, wz, 22) ** 1.6;
}

export function getBiomeTargetHeight(biome, wx, wz) {
  const region = biome.region;
  switch (region.id) {
    case "forest": {
      const roll = perlin2(wx / 26 + 41, wz / 26 + 13) * 3.2;
      return region.baseHeight + roll;
    }
    case "desert": {
      const dunes = perlin2(wx / 34 + 7, wz / 34 + 61) * 6.4
        + perlin2(wx / 12 + 5, wz / 12 + 29) * 2.6;
      // The oasis is a bowl, so it dips below the water table.
      return region.baseHeight + dunes - getOasisDepth(biome, wx, wz) * 6.5;
    }
    case "swamp": {
      // Sitting right on the water table is what fills the hollows with
      // pools without placing a single one by hand.
      const roll = perlin2(wx / 21 + 19, wz / 21 + 37) * 3.4;
      return region.baseHeight + roll;
    }
    case "canyon": {
      const broad = perlin2(wx / 46 + 23, wz / 46 + 3) * 14;
      const ridge = Math.abs(perlin2(wx / 18 + 11, wz / 18 + 47)) * 7;
      // Terracing in steps of three is what makes it read as layered rock.
      return Math.floor((region.baseHeight + broad + ridge) / 3) * 3;
    }
    case "ember": {
      // Seen from outside it is a rocky hill, domed towards the middle so it
      // is not a flat slab; the cavern is hollowed out under its lid.
      const dome = centreFalloff(biome, wx, wz, 46) ** 0.7;
      return 19 + dome * 10 + perlin2(wx / 19 + 31, wz / 19 + 13) * 1.9;
    }
    default:
      return region.baseHeight;
  }
}

/** Where the floor of the Ember Deep's cavern sits under its lid. */
export function getEmberFloor(biome, wx, wz) {
  return Math.round(biome.region.baseHeight + perlin2(wx / 22 + 53, wz / 22 + 71) * 2.6);
}

/**
 * The block a biome wants at this position, or null to fall through to the
 * ordinary rules. `height` is the surface of this column.
 */
export function getBiomeBlock(biome, wx, wy, wz, height) {
  switch (biome.region.id) {
    case "desert": {
      // The oasis keeps its grass, so the middle of the desert is green.
      if (getOasisDepth(biome, wx, wz) > 0.55) {
        return null;
      }
      if (wy > height - 5) {
        return BLOCKS.sand;
      }
      return null;
    }
    case "swamp": {
      if (wy === height) {
        return height <= WATER_LEVEL + 1 ? BLOCKS.mud : BLOCKS.grass;
      }
      if (wy > height - 3) {
        return BLOCKS.mud;
      }
      return null;
    }
    case "canyon": {
      if (wy > height - 2) {
        return BLOCKS.red_sand;
      }
      if (wy > 4) {
        return BLOCKS.red_rock;
      }
      return null;
    }
    case "ember":
      return getEmberBlock(biome, wx, wy, wz, height);
    default:
      return null;
  }
}

/**
 * The Ember Deep, hollowed out of its own mesa: netherrack floor with lava
 * pools, a stone lid overhead, and glowstone clustered on the underside so
 * there is something to see by.
 */
function getEmberBlock(biome, wx, wy, wz, height) {
  if (wy > height) {
    return BLOCKS.air;
  }
  // The roof hangs a fixed distance under whatever the surface turned out to
  // be, so the cavern seals itself wherever the hill runs out.
  const ceiling = height - EMBER_LID;
  const floor = getEmberFloor(biome, wx, wz);
  if (wy > ceiling) {
    return BLOCKS.stone;
  }
  if (ceiling - floor < 3) {
    return BLOCKS.netherrack;
  }
  if (wy === ceiling) {
    return hash3(wx * 0.31, 7, wz * 0.31) > 0.78 ? BLOCKS.glowstone : BLOCKS.netherrack;
  }
  if (wy > floor) {
    // Stalactites hanging a little way down from the roof.
    if (wy > ceiling - 3 && hash3(wx * 0.7, wy, wz * 0.7) > 0.93) {
      return BLOCKS.netherrack;
    }
    return BLOCKS.air;
  }
  if (wy === floor) {
    const pool = perlin2(wx / 12 + 17, wz / 12 + 5);
    if (pool > 0.34) {
      return BLOCKS.lava;
    }
    return hash3(wx * 0.5, 3, wz * 0.5) > 0.9 ? BLOCKS.glowstone : BLOCKS.netherrack;
  }
  // Below the floor: netherrack, and the ancient debris this place is for.
  if (hash3(wx * 0.17, wy * 0.31, wz * 0.17) > 0.955) {
    return BLOCKS.ancient_debris;
  }
  return BLOCKS.netherrack;
}
