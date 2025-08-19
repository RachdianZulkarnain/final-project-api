import { Prisma, PrismaClient } from "../../generated/prisma";

export class PrismaService extends PrismaClient {
  constructor() {
    super();
  }
}
