import { getAuthUser } from "@/lib/auth";
import { prisma } from "@exhale/db";
import { json } from "@/lib/http";
import { publicUserSelect } from "@/lib/user-select";

export async function GET(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth) return json({ error: "Unauthorized" }, 401);

  const user = await prisma.user.findUnique({
    where: { id: auth.authId },
    select: publicUserSelect,
  });
  if (!user) return json({ error: "Not provisioned" }, 404);

  return json({ data: user }, 200);
}
