import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../auth/auth.service';
import { ApiErrorNotifier } from '../http/api-error-notifier';
import { BrandLogoComponent } from '../../shared/brand-logo.component';
import { TEXTS } from '../../shared/texts';

/** Punto de corte "expanded" de Material 3. */
const WIDE_LAYOUT = '(min-width: 840px)';

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    BrandLogoComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  private readonly router = inject(Router);
  private readonly session = inject(AuthService).session;
  protected readonly notifier = inject(ApiErrorNotifier);
  protected readonly texts = TEXTS;

  protected readonly isWide = toSignal(
    inject(BreakpointObserver)
      .observe(WIDE_LAYOUT)
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly user = computed(() => {
    const state = this.session();
    return state.status === 'authenticated' ? state.user : null;
  });

  /** La navegación solo tiene sentido con sesión y fuera del login. */
  protected readonly showNavigation = computed(
    () => this.user() !== null && !this.url().startsWith('/entrar'),
  );

  protected readonly destinations = [
    { path: '/', label: TEXTS.nav.home, icon: 'home' },
    { path: '/perfil', label: TEXTS.nav.profile, icon: 'person' },
  ];
}
