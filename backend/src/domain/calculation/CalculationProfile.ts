/** Versión publicada (inmutable) de un perfil de cálculo (ADR-005, migración 0006). */
export interface CalculationProfileRef {
  id: string;
  version: number;
}

/** Perfil con el que nace todo grupo: reparto EQUAL y redondeo HALF_EVEN (docs/Algorithms.md). */
export const DEFAULT_CALCULATION_PROFILE: CalculationProfileRef = { id: 'default', version: 1 };
