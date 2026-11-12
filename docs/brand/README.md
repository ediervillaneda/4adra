# Marca de 4adra

**Logo:** monograma "4a" sobre una cuadrícula de 2×2, que alude a que las cuentas "cuadran". El "4" va en blanco y la "a" en menta, sobre fondo verde-azulado.

| Color | Hex |
|---|---|
| Verde-azulado (primario) | `#00796B` |
| Menta | `#B2DFDB` |
| Blanco | `#FFFFFF` |

- **Fuente de verdad:** `web/public/icons/icon.svg`. Es un vector redibujado a partir de `logo-original-ia.png`, la imagen generada con IA que se eligió entre 4 propuestas.
- `web/src/app/shared/brand-logo.component.ts` repite la misma geometría en línea.
- Los PNG se regeneran con ImageMagick, desde `web/public`:

```bash
r(){ magick -background none -density 192 "$1" -resize "$2x$2" -strip "$3"; }
sed 's/ rx="276"//' icons/icon.svg > /tmp/full.svg
sed -e 's/ rx="276"//' -e 's#<g transform="translate(0 13)">#<g transform="translate(627 627) scale(0.8) translate(-627 -614)">#' icons/icon.svg > /tmp/mask.svg
r icons/icon.svg 512 icons/icon-512.png
r icons/icon.svg 192 icons/icon-192.png
r /tmp/mask.svg 512 icons/icon-maskable-512.png        # símbolo al 80 %, dentro de la zona segura
r /tmp/full.svg 180 icons/apple-touch-icon.png          # iOS redondea las esquinas por su cuenta
cp icons/icon.svg favicon.svg
```
