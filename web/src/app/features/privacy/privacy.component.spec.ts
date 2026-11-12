import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PrivacyComponent } from './privacy.component';

describe('PrivacyComponent', () => {
  it('privacyShouldContainContactAndNoPhoneStatement', () => {
    const fixture = TestBed.createComponent(PrivacyComponent);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Política de privacidad');
    expect(text).toContain('privacidad@edier.me');
    expect(text).toContain('número de teléfono');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('a[href="mailto:privacidad@edier.me"]'),
    ).not.toBeNull();
  });
});
