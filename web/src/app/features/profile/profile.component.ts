import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProfileService, ProfileValidationError } from '../../core/profile/profile.service';
import { AuthService } from '../../core/auth/auth.service';
import { ProfileReviewFlag } from '../../core/profile/profile-review-flag';
import { CurrentProfileStore } from '../../core/profile/current-profile.store';
import {
  ProfileChanges,
  SUPPORTED_CURRENCIES,
  SUPPORTED_LANGUAGES,
  UserProfile,
} from '../../shared/api';
import { TEXTS } from '../../shared/texts';

type ProfileField = keyof ProfileChanges;
type LoadState = 'loading' | 'content' | 'error';

const MAX_TIME_ZONE_SUGGESTIONS = 50;
const ALL_TIME_ZONES: readonly string[] = Intl.supportedValuesOf('timeZone');

@Component({
  selector: 'app-profile',
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  private readonly profiles = inject(ProfileService);
  private readonly auth = inject(AuthService);
  private readonly reviewFlag = inject(ProfileReviewFlag);
  private readonly snackBar = inject(MatSnackBar);
  private readonly currentProfile = inject(CurrentProfileStore);

  protected readonly texts = TEXTS;
  protected readonly currencies = SUPPORTED_CURRENCIES;
  protected readonly languages = SUPPORTED_LANGUAGES;
  protected readonly state = signal<LoadState>('loading');
  protected readonly profile = signal<UserProfile | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = new FormGroup({
    displayName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    preferredCurrency: new FormControl('', { nonNullable: true }),
    language: new FormControl('', { nonNullable: true }),
    timeZone: new FormControl('', { nonNullable: true }),
  });

  private readonly timeZoneQuery = toSignal(this.form.controls.timeZone.valueChanges, {
    initialValue: '',
  });

  protected readonly timeZoneSuggestions = computed(() => {
    const query = this.timeZoneQuery().toLowerCase();
    return ALL_TIME_ZONES.filter((zone) => zone.toLowerCase().includes(query)).slice(
      0,
      MAX_TIME_ZONE_SUGGESTIONS,
    );
  });

  constructor() {
    void this.load();
  }

  protected errorFor(field: ProfileField): string | null {
    const errors = this.form.controls[field].errors;
    if (!errors) {
      return null;
    }
    if (typeof errors['server'] === 'string') {
      return errors['server'];
    }
    if (errors['required']) {
      return TEXTS.profile.errors['required'];
    }
    return TEXTS.profile.errors['length_1_to_100'];
  }

  protected async save(): Promise<void> {
    const current = this.profile();
    const name = this.form.controls.displayName;
    name.setValue(name.value.trim());
    if (current === null || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const changes = this.changedFields(current);
    this.saving.set(true);
    try {
      const updated = await this.profiles.updateProfile(changes);
      this.applyProfile(updated);
      this.currentProfile.set(updated);
      this.reviewFlag.markReviewed();
      this.snackBar.open(TEXTS.profile.saved, undefined, { duration: 3000 });
    } catch (error) {
      if (error instanceof ProfileValidationError) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          const control = this.form.get(field);
          control?.setErrors({ server: message });
          control?.markAsTouched();
        }
      }
    } finally {
      this.saving.set(false);
    }
  }

  protected signOut(): void {
    void this.auth.signOut();
  }

  private async load(): Promise<void> {
    try {
      this.applyProfile(await this.profiles.getProfile());
      this.state.set('content');
    } catch {
      this.state.set('error');
    }
  }

  private applyProfile(profile: UserProfile): void {
    this.profile.set(profile);
    this.form.setValue({
      displayName: profile.displayName,
      preferredCurrency: profile.preferredCurrency,
      language: profile.language,
      timeZone: profile.timeZone,
    });
  }

  /** Solo se envían los campos que cambiaron (PATCH). */
  private changedFields(current: UserProfile): Partial<ProfileChanges> {
    const value = this.form.getRawValue();
    const changes: Partial<ProfileChanges> = {};
    for (const field of Object.keys(value) as ProfileField[]) {
      if (value[field] !== current[field]) {
        changes[field] = value[field];
      }
    }
    return changes;
  }
}
