/* eslint-disable @typescript-eslint/no-var-requires */
import { NextFunction, Request, Response } from 'express';
import { responseBody } from '../helpers/responseHelpers';

import historyPricesLast7DaysJSON from '../assets/historyPricesLast7Days.json';
import { ItemHistoryPricesData } from '../config/interfaces/ItemStatsComponentsProps';

class ItemHistoryPricesController {
  async get(req: Request, res: Response, next: NextFunction) {
    const historyPricesLast7Days = historyPricesLast7DaysJSON as ItemHistoryPricesData;

    try {
      const { item } = req.query;

      const getData = async () => {
        try {
          if (!item || typeof item !== 'string' || !historyPricesLast7Days[item]) {
            return historyPricesLast7Days;
          }

          return historyPricesLast7Days[item];
        } catch (err) {
          console.log(err);
        }
      };

      const data = await getData();
      return res.status(200).json(responseBody(true, 'GET_MSG', data));
    } catch (err) {
      return next(err);
    }
  }
}

export default new ItemHistoryPricesController();
