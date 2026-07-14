# Fase 5 — Capacidades avanzadas

> Checklist operativo de `docs/Roadmap.md` Fase 5.

## Objetivo

Introducir automatización solo sobre una base ya validada: OCR de recibos, sugerencia de categoría/detección de duplicados, presupuestos y alertas, integraciones bancarias/de pago (sujetas a evaluación legal), simulaciones de reparto.

## Prerrequisitos

- [ ] Fases 1–4 completas y estables en producción con métricas de uso reales (Roadmap exige "medir adopción y calidad antes de ampliar alcance").

## Checklist

### Especificación previa

- [ ] Cada capacidad de esta fase necesita su propia especificación completa (entidades, endpoints, reglas) antes de programarse — ninguna está detallada hoy más allá de la mención en `docs/Roadmap.md`.
- [ ] OCR e integraciones bancarias/de pago requieren evaluación legal, de seguridad y de consentimiento explícita antes de cualquier diseño técnico (`docs/Roadmap.md` § "Fuera de alcance inicial").

### General

- [ ] Toda automatización es opcional y no modifica datos financieros sin confirmación explícita del usuario.
- [ ] OCR: revisión humana obligatoria antes de persistir un gasto sugerido.
- [ ] Sugerencia de categoría/duplicados: siempre explicable y confirmable, nunca automática silenciosa.
- [ ] Presupuestos/alertas/pronóstico: no vinculantes, no alteran balances ni gastos.
- [ ] Simulaciones de reparto: no modifican información real (mismo patrón que la simulación de perfil de cálculo de Fase 2).
- [ ] Conserva auditoría para toda sugerencia aceptada o descartada.

## Criterios de salida

- [ ] Toda automatización es opcional, no modifica datos financieros sin confirmación y conserva auditoría.

## Documentos relacionados

`docs/Roadmap.md` (Fase 5, y § "Fuera de alcance inicial").
