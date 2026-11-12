import { ChangeDetectionStrategy, Component, PendingTasks, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { GroupNotFoundError, GroupsService } from '../../../core/groups/groups.service';
import { GroupMember, GroupSummary } from '../../../shared/api';
import { TEXTS } from '../../../shared/texts';

type DetailState =
  | { status: 'loading' }
  | { status: 'content'; group: GroupSummary; members: GroupMember[] }
  | { status: 'notFound' }
  | { status: 'error' };

/** Detalle de un grupo: sus datos y sus miembros activos (historia #2 de la pieza 2). */
@Component({
  selector: 'app-group-detail',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatListModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (state().status) {
      @case ('loading') {
        <p>{{ texts.loading }}</p>
      }
      @case ('content') {
        @if (content(); as content) {
          <h1>{{ content.group.name }}</h1>
          @if (content.group.description) {
            <p class="description">{{ content.group.description }}</p>
          }
          <p class="currency">
            {{ texts.groups.defaultCurrency }}: {{ content.group.defaultCurrency }}
          </p>
          <h2 class="section-title">{{ texts.groups.membersTitle }}</h2>
          <mat-list>
            @for (member of content.members; track member.userId) {
              <mat-list-item data-testid="member-item">
                @if (member.photoUrl) {
                  <img
                    matListItemAvatar
                    [src]="member.photoUrl"
                    alt=""
                    referrerpolicy="no-referrer"
                  />
                } @else {
                  <mat-icon matListItemIcon>person</mat-icon>
                }
                <span matListItemTitle data-testid="member-name">{{ member.displayName }}</span>
                <span matListItemLine data-testid="member-role">{{
                  texts.groups.roles[member.role]
                }}</span>
              </mat-list-item>
            }
          </mat-list>
        }
      }
      @case ('notFound') {
        <h1>{{ texts.groups.notFoundTitle }}</h1>
        <a mat-flat-button routerLink="/">{{ texts.groups.backHome }}</a>
      }
      @case ('error') {
        <!-- El código de referencia lo muestra el banner global (authErrorInterceptor). -->
        <p>{{ texts.errors.generic }}</p>
      }
    }
  `,
  styles: `
    h1 {
      font: var(--mat-sys-headline-medium);
    }
    .description,
    .currency {
      color: var(--mat-sys-on-surface-variant);
    }
    .section-title {
      font: var(--mat-sys-title-medium);
    }
  `,
})
export class GroupDetailComponent {
  private readonly groupsService = inject(GroupsService);
  private readonly groupId = inject(ActivatedRoute).snapshot.paramMap.get('groupId') ?? '';
  protected readonly texts = TEXTS;
  protected readonly state = signal<DetailState>({ status: 'loading' });

  constructor() {
    // PendingTasks: la app (y las pruebas, con whenStable) no se dan por estables hasta que cargue.
    void inject(PendingTasks).run(() => this.load());
  }

  protected content(): Extract<DetailState, { status: 'content' }> | null {
    const state = this.state();
    return state.status === 'content' ? state : null;
  }

  private async load(): Promise<void> {
    try {
      const [group, members] = await Promise.all([
        this.groupsService.getGroup(this.groupId),
        this.groupsService.listMembers(this.groupId),
      ]);
      this.state.set({ status: 'content', group, members });
    } catch (error) {
      this.state.set({ status: error instanceof GroupNotFoundError ? 'notFound' : 'error' });
    }
  }
}
