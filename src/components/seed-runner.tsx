"use client";
import { useEffect } from "react";
import { seedDefaults } from "@/lib/db";

export function SeedRunner() {
  useEffect(() => {
    seedDefaults().catch(console.error);
  }, []);
  return null;
}