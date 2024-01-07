/* eslint-disable @typescript-eslint/no-var-requires */
import { NextFunction, Request, Response } from 'express';
import { responseBody } from '../helpers/responseHelpers';
import fs from 'fs';
import path from 'path';

class ManageResourcesController {
  get = (req: Request, res: Response, next: NextFunction) => {
    const { acc } = req.query;
    const fileName = `${acc}_timer.json`;
    const filePath = path.join(__dirname, '..', 'assets', fileName);

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    if (!fileContent) {
      return res.status(404).json(responseBody(false, 'CODE_NOT_FOUND', null));
    }

    const fileParsed = JSON.parse(fileContent);
    return res.status(200).json(responseBody(true, 'GET_MSG', fileParsed));
  };

  post = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const dataValues: {
        resourceName: string;
        cooldown: number;
        landNumber: number;
        startTime: number;
        acc: string;
      } = Object.values(data);

      const dataString = JSON.stringify(data);

      // FIX ACC
      const fileName = `${dataValues[0].acc}_timer.json`;
      const filePath = path.join(__dirname, '..', 'assets', fileName);

      fs.writeFileSync(filePath, dataString);

      res.status(200).json(responseBody(true, 'GENERIC_MSG', null));
    } catch (err) {
      next(err);
    }
  };
}

export default new ManageResourcesController();
