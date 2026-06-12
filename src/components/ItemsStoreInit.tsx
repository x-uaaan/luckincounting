"use client";

import { useEffect } from "react";
import { useItemsStore } from "@/store/useItemsStore";

export default function ItemsStoreInit() {
  useEffect(() => {
    void useItemsStore.getState().init();
  }, []);

  return null;
}
