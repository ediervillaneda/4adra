import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BROWSER_NAVIGATOR, BrowserNavigator } from '../../../core/browser-navigator';
import { ShareInviteLinkDialogComponent } from './share-invite-link-dialog.component';

const LINK = {
  data: { groupId: 'grp_casa', code: 'codigo-1', expiresAt: '2026-11-20T12:00:00.000Z' },
  meta: { requestId: 'req_1' },
};

let http: HttpTestingController;

function render(browser: BrowserNavigator): ComponentFixture<ShareInviteLinkDialogComponent> {
  TestBed.configureTestingModule({
    imports: [ShareInviteLinkDialogComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: MAT_DIALOG_DATA, useValue: { groupId: 'grp_casa', groupName: 'Casa' } },
      { provide: BROWSER_NAVIGATOR, useValue: browser },
    ],
  });
  http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(ShareInviteLinkDialogComponent);
  fixture.detectChanges();
  return fixture;
}

/** Pulsa "Crear enlace" y responde con el enlace de "Casa". */
async function createLink(
  fixture: ComponentFixture<ShareInviteLinkDialogComponent>,
): Promise<HTMLElement> {
  const element = fixture.nativeElement as HTMLElement;
  element.querySelector<HTMLButtonElement>('[data-testid="create-link"]')?.click();
  const request = http.expectOne('/api/v1/groups/grp_casa/members/invite-link');
  expect(request.request.method).toBe('POST');
  request.flush(LINK, { status: 201, statusText: 'Created' });
  await fixture.whenStable();
  fixture.detectChanges();
  return element;
}

const URL = `${window.location.origin}/unirse/codigo-1`;

describe('ShareInviteLinkDialogComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    http.verify();
  });

  it('shareDialogShouldCreateLinkOnRequestAndCopyIt', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const fixture = render({ clipboard: { writeText } });
    const element = fixture.nativeElement as HTMLElement;

    // Antes de pedirlo, solo el aviso: abrir el diálogo no reemplaza el enlace vigente.
    expect(element.textContent).toContain('Si creas uno nuevo, el anterior deja de servir.');
    http.expectNone('/api/v1/groups/grp_casa/members/invite-link');

    await createLink(fixture);
    expect(element.querySelector('[data-testid="link-url"]')?.textContent?.trim()).toBe(URL);

    element.querySelector<HTMLButtonElement>('[data-testid="copy-link"]')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(writeText).toHaveBeenCalledWith(URL);
    expect(element.textContent).toContain('Enlace copiado');
  });

  it('shareDialogShouldShowErrorWhenLinkCannotBeCreated', async () => {
    const fixture = render({ clipboard: { writeText: vi.fn() } });
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('[data-testid="create-link"]')?.click();
    http
      .expectOne('/api/v1/groups/grp_casa/members/invite-link')
      .flush(
        { error: { code: 'INTERNAL_ERROR', message: 'x' }, meta: { requestId: 'req_1' } },
        { status: 500, statusText: 'Error' },
      );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Algo salió mal.');
    expect(element.querySelector('[data-testid="create-link"]')).not.toBeNull();
  });

  it('shareDialogShouldExplainWhenCopyFails', async () => {
    const writeText = vi.fn().mockRejectedValue(new DOMException('Denegado', 'NotAllowedError'));
    const fixture = render({ clipboard: { writeText } });
    const element = await createLink(fixture);

    element.querySelector<HTMLButtonElement>('[data-testid="copy-link"]')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'No se pudo copiar. Copia el enlace a mano.',
    );
    expect(element.textContent).not.toContain('Enlace copiado');
  });

  it('shareDialogShouldIgnoreClosingTheShareSheet', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('Cancelado', 'AbortError'));
    const fixture = render({ clipboard: { writeText: vi.fn() }, share });
    const element = await createLink(fixture);

    element.querySelector<HTMLButtonElement>('[data-testid="share-link"]')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(share).toHaveBeenCalled();
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });

  it('shareDialogShouldOfferNativeShareOnlyWhenAvailable (sin share)', async () => {
    const element = await createLink(render({ clipboard: { writeText: vi.fn() } }));

    expect(element.querySelector('[data-testid="share-link"]')).toBeNull();
  });

  it('shareDialogShouldOfferNativeShareOnlyWhenAvailable (con share)', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const fixture = render({ clipboard: { writeText: vi.fn() }, share });
    const element = await createLink(fixture);

    element.querySelector<HTMLButtonElement>('[data-testid="share-link"]')?.click();
    await fixture.whenStable();

    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: URL }));
  });
});
