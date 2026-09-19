import { Response, NextFunction } from 'express';
import { clientService } from '../services/clientService';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export const clientController = {
  async listClients(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const clients = await clientService.listClients();
      sendSuccess(res, clients);
    } catch (err) {
      next(err);
    }
  },

  async getClient(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const client = await clientService.getClientById(req.params.id);
      sendSuccess(res, client);
    } catch (err) {
      next(err);
    }
  },

  async createClient(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const client = await clientService.createClient(req.body);
      sendSuccess(res, client, 'Client created', 201);
    } catch (err) {
      next(err);
    }
  },

  async updateClient(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const client = await clientService.updateClient(req.params.id, req.body);
      sendSuccess(res, client, 'Client updated');
    } catch (err) {
      next(err);
    }
  },

  async deleteClient(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await clientService.deleteClient(req.params.id);
      sendSuccess(res, null, 'Client deleted');
    } catch (err) {
      next(err);
    }
  },
};
