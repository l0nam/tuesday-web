import { z } from "zod";
import {
  badId,
  handleCityRequest,
  jsonResponse,
  parseId,
  readBody,
} from "@/lib/cities/api";
import { reviewApplication } from "@/lib/cities/service";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept") }),
  z.object({ action: z.literal("reject"), reason: z.string().max(2000) }),
]);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; appId: string }> },
) {
  const { id, appId } = await params;
  const cityId = parseId(id);
  const applicationId = parseId(appId);
  if (!cityId || !applicationId) return badId();

  return handleCityRequest(req, async (userId) => {
    const body = await readBody(req, bodySchema);
    if (!body.ok) return body.response;
    const result = await reviewApplication(
      userId,
      cityId,
      applicationId,
      body.data,
    );
    if (result.status === "applicant_unavailable") {
      return jsonResponse(
        {
          error: {
            code: "applicant_unavailable",
            message: "Игрок уже вступил в другой клан, заявка закрыта",
          },
        },
        409,
      );
    }
    return jsonResponse(result);
  });
}
