import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../auth/auth.service';
import { ApiErrorNotifier } from '../http/api-error-notifier';
import { OnlineStatus } from '../network/online-status';
import { CurrentProfileStore } from '../profile/current-profile.store';
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
  private readonly auth = inject(AuthService);
  private readonly session = this.auth.session;
  private readonly currentProfile = inject(CurrentProfileStore);
  protected readonly notifier = inject(ApiErrorNotifier);
  protected readonly onlineStatus = inject(OnlineStatus);
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

  protected readonly isCheckingSession = computed(() => this.session().status === 'loading');

  /** Foto y nombre del perfil de la app; mientras carga, los de Google. */
  protected readonly avatar = computed(() => {
    const user = this.user();
    const profile = this.currentProfile.profile();
    if (user === null) {
      return null;
    }
    return {
      name: profile?.displayName ?? user.name,
      image: profile ? profile.photoUrl : user.image,
    };
  });

  constructor() {
    // Las rutas públicas no tienen guard: el shell resuelve la sesión al arrancar.
    if (this.session().status === 'loading') {
      void this.auth.refreshSession();
    }
    effect(() => {
      // Al volver la conexión, reintenta consultar la sesión que no se pudo verificar.
      if (this.onlineStatus.isOnline() && this.session().status === 'unavailable') {
        void this.auth.refreshSession();
      }
    });
    effect(() => {
      if (this.session().status === 'authenticated') {
        void this.currentProfile.load();
      } else if (this.session().status === 'anonymous') {
        this.currentProfile.clear();
      }
    });
  }

  /** La navegación solo tiene sentido con sesión y fuera del login. */
  protected readonly showNavigation = computed(
    () => this.user() !== null && !this.url().startsWith('/entrar'),
  );

  protected readonly destinations = [
    { path: '/', label: TEXTS.nav.home, icon: 'home' },
    { path: '/perfil', label: TEXTS.nav.profile, icon: 'person' },
  ];
}
