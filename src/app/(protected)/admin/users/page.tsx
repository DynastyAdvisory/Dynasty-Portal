import { prisma } from "@/lib/prisma"
import UsersClient from "./UsersClient"

export default async function UsersPage() {
  const [profiles, clients] = await Promise.all([
    prisma.profile.findMany({
      orderBy: { createdAt: "asc" },
      include: { client: true, assignments: { include: { client: true } } },
    }),
    prisma.client.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ])

  return <UsersClient profiles={profiles} clients={clients} />
}
