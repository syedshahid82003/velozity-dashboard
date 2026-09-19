import prisma from '../config/prisma';

export interface ClientInput {
  name: string;
  email: string;
  company: string;
}

export const clientService = {
  async listClients() {
    return prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { projects: true } } },
    });
  },

  async getClientById(id: string) {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        projects: {
          select: { id: true, name: true, createdAt: true, _count: { select: { tasks: true } } },
        },
      },
    });
    if (!client) throw Object.assign(new Error('Client not found'), { statusCode: 404 });
    return client;
  },

  async createClient(data: ClientInput) {
    return prisma.client.create({ data });
  },

  async updateClient(id: string, data: Partial<ClientInput>) {
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) throw Object.assign(new Error('Client not found'), { statusCode: 404 });
    return prisma.client.update({ where: { id }, data });
  },

  async deleteClient(id: string) {
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) throw Object.assign(new Error('Client not found'), { statusCode: 404 });
    await prisma.client.delete({ where: { id } });
  },
};
