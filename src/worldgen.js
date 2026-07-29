// Biome blending plus city, suburb and snow-realm structures.

import { BLOCKS, CITY_PLAN, SNOW_REALM, SUBURB_PLAN } from "./constants.js";
import { hash3, isInsideRect, perlin2 } from "./math.js";
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
