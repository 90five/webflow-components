import type { ServiceDef } from "./types";

// Every file in ./services (except those starting with "_") default-exports one ServiceDef.
const modules = import.meta.glob<{ default: ServiceDef }>(["./services/*.ts", "!./services/_*.ts"], { eager: true });

/** Null-prototype lookup table: ids like "constructor" or "toString" are never found. */
export const SERVICES: Record<string, ServiceDef> = Object.assign(
  Object.create(null),
  Object.fromEntries(Object.values(modules).map((m) => [m.default.id, m.default])),
);
