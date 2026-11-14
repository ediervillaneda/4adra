import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { JoinGroupComponent } from './join-group.component';

const META = { meta: { requestId: 'req_1' } };

let http: HttpTestingController;

function render(code = 'codigo-1'): ComponentFixture<JoinGroupComponent> {
  TestBed.configureTestingModule({
    imports: [JoinGroupComponent],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ code }) } },
      },
    ],
  });
  http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(JoinGroupComponent);
  fixture.detectChanges();
  return fixture;
}

describe('JoinGroupComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    http.verify();
  });

  it('joinPageShouldShowGroupAndJoinOnConfirm', async () => {
    const fixture = render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    http.expectOne('/api/v1/invite-links/codigo-1').flush({
      data: { groupId: 'grp_casa', groupName: 'Casa', expiresAt: '2026-11-20T12:00:00.000Z' },
      ...META,
    });
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Te invitan a «Casa»');
    element.querySelector<HTMLButtonElement>('[data-testid="join-group"]')?.click();
    const join = http.expectOne('/api/v1/invite-links/codigo-1/join');
    expect(join.request.method).toBe('POST');
    join.flush({
      data: {
        groupId: 'grp_casa',
        userId: 'usr_juan',
        role: 'MEMBER',
        status: 'ACTIVE',
        joinedAt: '2026-11-13T12:00:00.000Z',
      },
      ...META,
    });
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith('/grupos/grp_casa');
  });

  it('joinPageShouldEncodeCodeInApiUrl', async () => {
    const fixture = render('../../groups/G/members/invite-link?');
    http
      .expectOne('/api/v1/invite-links/..%2F..%2Fgroups%2FG%2Fmembers%2Finvite-link%3F')
      .flush(
        { error: { code: 'INVITE_LINK_NOT_FOUND', message: 'x' }, ...META },
        { status: 404, statusText: 'Not Found' },
      );
    await fixture.whenStable();
  });

  it.each([
    [
      404,
      'INVITE_LINK_NOT_FOUND',
      'Este enlace ya no sirve. Pide uno nuevo a quien te lo compartió.',
    ],
    [409, 'INVITE_LINK_EXPIRED', 'Este enlace ya venció. Pide uno nuevo a quien te lo compartió.'],
  ])(
    'joinPageShouldExplainUnavailableLinkWithoutJoinButton (%i %s)',
    async (status, code, message) => {
      const fixture = render();
      http
        .expectOne('/api/v1/invite-links/codigo-1')
        .flush({ error: { code, message: 'x' }, ...META }, { status, statusText: 'Error' });
      await fixture.whenStable();
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;

      expect(element.textContent).toContain(message);
      expect(element.querySelector('[data-testid="join-group"]')).toBeNull();
    },
  );
});
