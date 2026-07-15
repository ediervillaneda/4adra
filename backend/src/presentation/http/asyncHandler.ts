import { NextFunction, Request, Response } from 'express';

type AsyncRequestHandler<Req extends Request = Request> = (
  req: Req,
  res: Response,
  next: NextFunction,
) => Promise<void>;

export function asyncHandler<Req extends Request = Request>(
  handler: AsyncRequestHandler<Req>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    handler(req as Req, res, next).catch(next);
  };
}
