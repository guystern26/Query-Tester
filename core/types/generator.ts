/**
 * Generator-related types — spec section 17.6.
 */
import type { EntityId, GeneratorType } from './base';

// ─── Generator Configs ─────────────────────────────────────────────────────

/** Numbered — no variants, single config */
export interface NumberedGeneratorConfig {
  pattern: string;
  rangeStart: number;
  rangeEnd: number;
  padLength: number;
}

/** Pick List — weighted items */
export interface PickListItem {
  id: EntityId;
  value: string;
  weight: number;
}
export interface PickListGeneratorConfig {
  items: PickListItem[];
}

/** Random Number — variants with prefix/suffix */
export interface RandomNumberVariant {
  id: EntityId;
  min: number;
  max: number;
  decimals: number;
  prefix: string;
  suffix: string;
  weight: number;
}
export interface RandomNumberGeneratorConfig {
  variants: RandomNumberVariant[];
}

/** Unique ID — variants with format + prefix/suffix */
export type UniqueIdFormat = 'uuid' | 'sequential' | 'alphanumeric' | 'numeric' | 'hex';
export interface UniqueIdVariant {
  id: EntityId;
  format: UniqueIdFormat;
  prefix: string;
  suffix: string;
  length: number;
  weight: number;
}
export interface UniqueIdGeneratorConfig {
  variants: UniqueIdVariant[];
}

/** Email — variants with localPart @ domain */
export type EmailComponentType = 'numeric' | 'string';
export interface EmailVariant {
  id: EntityId;
  localPart: string;
  domain: string;
  componentType: EmailComponentType;
  componentLength: number;
  weight: number;
}
export interface EmailGeneratorConfig {
  variants: EmailVariant[];
}

/** IP Address — variants with ipType + prefix/suffix */
export type IpType = 'ipv4' | 'ipv6' | 'private_a' | 'private_b' | 'private_c';
export interface IpAddressVariant {
  id: EntityId;
  ipType: IpType;
  prefix: string;
  suffix: string;
  weight: number;
}
export interface IpAddressGeneratorConfig {
  variants: IpAddressVariant[];
}

/** General Field — variants with componentType + prefix/suffix */
export type GeneralComponentType = 'alphanumeric' | 'numeric' | 'alpha' | 'hex';
export interface GeneralFieldVariant {
  id: EntityId;
  prefix: string;
  suffix: string;
  componentType: GeneralComponentType;
  componentLength: number;
  weight: number;
}
export interface GeneralFieldGeneratorConfig {
  variants: GeneralFieldVariant[];
}

export interface FieldGenerationRule {
  id: EntityId;
  field: string;
  type: GeneratorType;
  /** Type-specific config — use typed interfaces (e.g. PickListGeneratorConfig) in components. */
  config: Record<string, unknown>;
}

export interface GeneratorConfig {
  enabled: boolean;
  eventCount?: number;
  rules: FieldGenerationRule[];
}
