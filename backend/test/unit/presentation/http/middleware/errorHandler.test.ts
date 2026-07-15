import { Request, Response } from 'express';
import { errorHandlerMiddleware } from '../../../../../src/presentation/http/middleware/errorHandler';
import { UnauthenticatedException } from '../../../../../src/domain/auth/errors';
import { UserDisabledException } from '../../../../../src/domain/user/errors';

function responseSpy(): Response & { status: jest.Mock; json: jest.Mock } {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response & { status: jest.Mock; json: jest.Mock };
}

describe('errorHandlerMiddleware', () => {
  it('shouldMapUnauthenticatedExceptionTo401', () => {
    const req = { requestId: 'req_123' } as unknown as Request;
    const res = responseSpy();

    errorHandlerMiddleware(new UnauthenticatedException('falta token.'), req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'UNAUTHENTICATED', message: 'Solicitud no autenticada: falta token.' },
      meta: { requestId: 'req_123' },
    });
  });

  it('shouldMapUserDisabledExceptionTo403', () => {
    const req = { requestId: 'req_123' } as unknown as Request;
    const res = responseSpy();

    errorHandlerMiddleware(new UserDisabledException('usr_ana'), req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('shouldMapUnknownErrorTo500WithInternalErrorCode', () => {
    const req = { requestId: 'req_123' } as unknown as Request;
    const res = responseSpy();

    errorHandlerMiddleware(new Error('boom'), req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'Error interno inesperado.' },
      meta: { requestId: 'req_123' },
    });
  });

  it('shouldFallBackToUnknownRequestIdWhenMissing', () => {
    const req = {} as Request;
    const res = responseSpy();

    errorHandlerMiddleware(new Error('boom'), req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ meta: { requestId: 'unknown' } }),
    );
  });
});
