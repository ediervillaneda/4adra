import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PRIVACY } from '../../shared/texts';

@Component({
  selector: 'app-privacy',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article>
      <h1>{{ privacy.title }}</h1>
      <p class="updated">{{ privacy.updatedAt }}</p>
      @for (section of privacy.sections; track section.heading) {
        <section>
          <h2>{{ section.heading }}</h2>
          @for (paragraph of section.paragraphs; track paragraph) {
            <p>{{ paragraph }}</p>
          }
        </section>
      }
      <p>
        <a [href]="'mailto:' + privacy.contactEmail">{{ privacy.contactEmail }}</a>
      </p>
    </article>
  `,
  styles: `
    h1 {
      font: var(--mat-sys-headline-medium);
    }
    h2 {
      font: var(--mat-sys-title-medium);
      margin-top: 24px;
    }
    .updated {
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class PrivacyComponent {
  protected readonly privacy = PRIVACY;
}
