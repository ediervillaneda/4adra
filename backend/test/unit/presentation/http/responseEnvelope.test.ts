import { successEnvelope, errorEnvelope } from '../../../../src/presentation/http/responseEnvelope';

describe('responseEnvelope', () => {
  it('shouldWrapDataWithRequestIdInMeta', () => {
    expect(successEnvelope({ id: 'usr_ana' }, 'req_123')).toEqual({
      data: { id: 'usr_ana' },
      meta: { requestId: 'req_123' },
    });
  });

  it('shouldBuildErrorEnvelopeWithoutDetailsWhenNoneProvided', () => {
    expect(errorEnvelope('UNAUTHENTICATED', 'Falta token.', 'req_123')).toEqual({
      error: { code: 'UNAUTHENTICATED', message: 'Falta token.' },
      meta: { requestId: 'req_123' },
    });
  });

  it('shouldBuildErrorEnvelopeWithDetailsWhenProvided', () => {
    const details = [{ field: 'splits', reason: 'TOTAL_MISMATCH' }];
    expect(errorEnvelope('INVALID_SPLIT', 'No totaliza.', 'req_123', details)).toEqual({
      error: { code: 'INVALID_SPLIT', message: 'No totaliza.', details },
      meta: { requestId: 'req_123' },
    });
  });
});
