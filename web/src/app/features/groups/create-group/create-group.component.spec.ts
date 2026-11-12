import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { CreateGroupComponent } from './create-group.component';
import { GroupsService, GroupValidationError } from '../../../core/groups/groups.service';
import { CurrentProfileStore } from '../../../core/profile/current-profile.store';
import { ANA_PROFILE } from '../../../core/profile/profile.fixtures';

interface Fakes {
  createGroup: ReturnType<typeof vi.fn>;
}

async function render(
  fakes: Fakes,
  preferredCurrency = 'USD',
): Promise<ComponentFixture<CreateGroupComponent>> {
  TestBed.configureTestingModule({
    imports: [CreateGroupComponent],
    providers: [
      provideRouter([]),
      { provide: GroupsService, useValue: { createGroup: fakes.createGroup } },
      {
        provide: CurrentProfileStore,
        useValue: {
          profile: signal({ ...ANA_PROFILE, preferredCurrency }),
          load: () => Promise.resolve(),
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(CreateGroupComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

function field(fixture: ComponentFixture<CreateGroupComponent>, name: string): HTMLElement {
  return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
    `[formControlName="${name}"]`,
  )!;
}

function type(fixture: ComponentFixture<CreateGroupComponent>, name: string, value: string): void {
  const element = field(fixture, name) as HTMLInputElement;
  element.value = value;
  element.dispatchEvent(new Event('input'));
  fixture.detectChanges();
}

async function submit(fixture: ComponentFixture<CreateGroupComponent>): Promise<void> {
  (fixture.nativeElement as HTMLElement).querySelector('form')!.dispatchEvent(new Event('submit'));
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('CreateGroupComponent', () => {
  let fakes: Fakes;

  beforeEach(() => {
    TestBed.resetTestingModule();
    fakes = { createGroup: vi.fn() };
  });

  it('createGroupShouldPreselectProfileCurrency', async () => {
    const fixture = await render(fakes, 'EUR');

    expect(field(fixture, 'defaultCurrency').textContent).toContain('EUR');
  });

  it('createGroupShouldPostAndNavigateHome', async () => {
    fakes.createGroup.mockResolvedValue({ id: 'grp_1' });
    const fixture = await render(fakes, 'EUR');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    type(fixture, 'name', '  Viaje Guatemala  ');
    type(fixture, 'description', 'Vacaciones 2027');
    await submit(fixture);

    expect(fakes.createGroup).toHaveBeenCalledWith({
      name: 'Viaje Guatemala',
      description: 'Vacaciones 2027',
      defaultCurrency: 'EUR',
    });
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('createGroupShouldShowFieldErrorsFrom400', async () => {
    fakes.createGroup.mockRejectedValue(
      new GroupValidationError({ name: 'Debe tener entre 1 y 120 caracteres.' }),
    );
    const fixture = await render(fakes);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    type(fixture, 'name', 'Casa');
    await submit(fixture);

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Debe tener entre 1 y 120 caracteres.',
    );
    expect(navigate).not.toHaveBeenCalled();
  });
});
