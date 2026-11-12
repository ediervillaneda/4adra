import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Logo provisional "4a" (círculo verde-azulado). Se reemplaza cuando exista marca definitiva. */
@Component({
  selector: 'app-brand-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 96 96"
      role="img"
      aria-label="4adra"
    >
      <circle cx="48" cy="48" r="48" fill="var(--mat-sys-primary)" />
      <text
        x="48"
        y="61"
        text-anchor="middle"
        font-family="Roboto, sans-serif"
        font-size="40"
        font-weight="700"
        fill="var(--mat-sys-on-primary)"
      >
        4a
      </text>
    </svg>
  `,
})
export class BrandLogoComponent {
  readonly size = input(96);
}
