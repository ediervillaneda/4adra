import { describe, it, expect } from 'vitest';
import { PRIVACY, TEXTS } from './texts';

describe('TEXTS', () => {
  it('shouldBuildDynamicTextsInSpanish', () => {
    expect(TEXTS.home.greeting('Ana')).toBe('Hola, Ana');
    expect(TEXTS.profile.photoAlt('Ana')).toBe('Foto de Ana');
    expect(TEXTS.errors.withReference('req_9')).toBe(
      'Algo salió mal. Código de referencia: req_9.',
    );
  });

  it('privacyShouldStateNoPhoneNumberIsCollected', () => {
    const text = PRIVACY.sections.flatMap((section) => section.paragraphs).join(' ');

    expect(text).toContain('número de teléfono');
    expect(PRIVACY.contactEmail).toBe('privacidad@edier.me');
  });
});
