import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Logo de 4adra: monograma "4a" sobre una cuadrícula de 2×2 (las cuentas "cuadran").
 * Misma geometría que `public/icons/icon.svg`, de donde salen los íconos de la PWA.
 */
@Component({
  selector: 'app-brand-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 1254 1254"
      role="img"
      aria-label="4adra"
    >
      <rect width="1254" height="1254" rx="276" fill="#00796B" />
      <g transform="translate(0 13)">
        <path
          fill="#FFFFFF"
          d="M640 272H570Q528 272 500 300L278 522Q248 552 248 592V658Q248 708 300 708H528V875Q528 955 608 955H640Z"
        />
        <path fill="#B2DFDB" d="M665 272H795Q1005 272 1005 482V568H665Z" />
        <path fill="#B2DFDB" d="M665 592H1005V900Q1005 955 948 955H905V912Q860 955 795 955H665Z" />
        <g fill="#00796B">
          <path d="M528 425V592H365Z" />
          <rect x="528" y="568" width="480" height="24" />
          <ellipse cx="796" cy="758" rx="102" ry="94" />
        </g>
      </g>
    </svg>
  `,
})
export class BrandLogoComponent {
  readonly size = input(96);
}
