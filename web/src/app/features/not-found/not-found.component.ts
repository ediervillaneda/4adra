import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { TEXTS } from '../../shared/texts';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <h1>{{ texts.notFound.title }}</h1>
      <a mat-stroked-button routerLink="/">{{ texts.notFound.backHome }}</a>
    </section>
  `,
  styles: `
    section {
      padding: 48px 16px;
      text-align: center;
    }
    h1 {
      font: var(--mat-sys-headline-small);
    }
  `,
})
export class NotFoundComponent {
  protected readonly texts = TEXTS;
}
