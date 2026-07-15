import { Response } from 'express';
import { GetCurrentUserProfileUseCase } from '../../../application/user/GetCurrentUserProfileUseCase';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { RequestWithId } from '../middleware/requestId';
import { successEnvelope } from '../responseEnvelope';

type MeRequest = AuthenticatedRequest & RequestWithId;

export function createGetMeHandler(
  useCase: GetCurrentUserProfileUseCase,
): (req: MeRequest, res: Response) => Promise<void> {
  return async (req: MeRequest, res: Response): Promise<void> => {
    const profile = await useCase.execute({ actor: req.actor });
    res.status(200).json(successEnvelope(profile, req.requestId));
  };
}
