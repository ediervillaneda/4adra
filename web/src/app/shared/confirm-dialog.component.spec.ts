import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

let close: ReturnType<typeof vi.fn>;
let dialogRef: { close: ReturnType<typeof vi.fn>; disableClose: boolean | undefined };

function render(confirm: () => Promise<void>): ComponentFixture<ConfirmDialogComponent> {
  close = vi.fn();
  dialogRef = { close, disableClose: false };
  const data: ConfirmDialogData = {
    title: '¿Remover a «Ana» del grupo?',
    message: 'Dejará de ver el grupo.',
    confirmLabel: 'Remover',
    confirm,
  };
  TestBed.configureTestingModule({
    imports: [ConfirmDialogComponent],
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: data },
      { provide: MatDialogRef, useValue: dialogRef },
    ],
  });
  const fixture = TestBed.createComponent(ConfirmDialogComponent);
  fixture.detectChanges();
  return fixture;
}

function click(fixture: ComponentFixture<ConfirmDialogComponent>, testId: string): void {
  (fixture.nativeElement as HTMLElement)
    .querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)
    ?.click();
}

describe('ConfirmDialogComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('confirmDialogShouldShowTitleMessageAndConfirmLabel', () => {
    const element = render(() => Promise.resolve()).nativeElement as HTMLElement;

    expect(element.querySelector('h2')?.textContent?.trim()).toBe('¿Remover a «Ana» del grupo?');
    expect(element.textContent).toContain('Dejará de ver el grupo.');
    expect(element.querySelector('[data-testid="confirm"]')?.textContent?.trim()).toBe('Remover');
  });

  it('confirmDialogShouldRunActionAndCloseWithTrue', async () => {
    const confirm = vi.fn().mockResolvedValue(undefined);
    const fixture = render(confirm);

    click(fixture, 'confirm');
    await fixture.whenStable();

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledWith(true);
  });

  it('confirmDialogShouldShowErrorAndStayOpenWhenActionFails', async () => {
    const fixture = render(() =>
      Promise.reject(new Error('Esa persona ya no es miembro del grupo.')),
    );

    click(fixture, 'confirm');
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'Esa persona ya no es miembro del grupo.',
    );
    expect(close).not.toHaveBeenCalled();
  });

  it('confirmDialogShouldCloseWithoutResultOnCancel', () => {
    const confirm = vi.fn();
    const fixture = render(confirm);

    click(fixture, 'cancel');

    expect(close).toHaveBeenCalledWith(undefined);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('confirmDialogShouldNotLetUserCloseWhileActionRuns', async () => {
    let finish: () => void = () => undefined;
    const fixture = render(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const element = fixture.nativeElement as HTMLElement;
    const cancel = (): HTMLButtonElement | null =>
      element.querySelector<HTMLButtonElement>('[data-testid="cancel"]');

    click(fixture, 'confirm');
    fixture.detectChanges();
    // Mientras corre: ni Cancelar ni Escape ni clic fuera cierran el diálogo.
    expect(cancel()?.disabled).toBe(true);
    expect(dialogRef.disableClose).toBe(true);

    finish();
    await fixture.whenStable();

    expect(close).toHaveBeenCalledWith(true);
  });

  it('confirmDialogShouldLetUserCloseAgainWhenActionFails', async () => {
    const fixture = render(() => Promise.reject(new Error('No se pudo.')));

    click(fixture, 'confirm');
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector<HTMLButtonElement>('[data-testid="cancel"]')?.disabled).toBe(
      false,
    );
    expect(dialogRef.disableClose).toBe(false);
  });
});
