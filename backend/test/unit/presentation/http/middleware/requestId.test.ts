import { Request, Response } from 'express';
import { requestIdMiddleware, RequestWithId } from '../../../../../src/presentation/http/middleware/requestId';

describe('requestIdMiddleware', () => {
  it('shouldAssignAUuidRequestIdAndCallNext', () => {
    const req = {} as Request;
    const res = {} as Response;
    const next = jest.fn();

    requestIdMiddleware(req, res, next);

    const requestId = (req as RequestWithId).requestId;
    expect(requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('shouldAssignADifferentRequestIdOnEachCall', () => {
    const req1 = {} as Request;
    const req2 = {} as Request;
    const res = {} as Response;
    const next = jest.fn();

    requestIdMiddleware(req1, res, next);
    requestIdMiddleware(req2, res, next);

    expect((req1 as RequestWithId).requestId).not.toBe((req2 as RequestWithId).requestId);
  });
});
