// Material Expired — Loss container-tare presets (countingflow.md §A.6)
import type { Container } from "@/lib/types";

export const CONTAINERS: Container[] = [
  { id: "pitcher",           name: "Pitcher",           tare_g: 286,   sort_order: 10, tare_variants: null },
  { id: "jug",               name: "Jug",               tare_g: 281.5, sort_order: 20, tare_variants: null },
  { id: "powder_container",  name: "Powder container",  tare_g: 191,   sort_order: 30, tare_variants: null },
  { id: "squeezer",          name: "Squeezer",          tare_g: 31.5,  sort_order: 40, tare_variants: null },
  { id: "canister",          name: "Canister",          tare_g: 694,   sort_order: 50, tare_variants: null },
  { id: "small_pitcher",     name: "Small pitcher",     tare_g: 138,   sort_order: 60, tare_variants: null },
  { id: "coffee_tupperware", name: "Coffee tupperware", tare_g: 268,   sort_order: 70, tare_variants: null },
];
