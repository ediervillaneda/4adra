import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AppShellComponent } from './core/layout/app-shell.component';

@Component({
  selector: 'app-root',
  imports: [AppShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<app-shell />',
})
export class App {}
