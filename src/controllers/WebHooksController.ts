import { NextFunction, Request, Response } from 'express';
import { responseBody } from '../helpers/responseHelpers';

class WebHooksController {
  skyMavis = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body;
      console.log(body);

      res.status(200).json(responseBody(true, 'GET_USER_INFO', 'GENERIC_MSG', null));
    } catch (err) {
      next(err);
    }
  };
}

export default new WebHooksController();
