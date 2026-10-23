import { z } from "zod";
import { handleCityRequest, jsonResponse, readBody } from "@/lib/cities/api";
import { createCity } from "@/lib/cities/service";

const bodySchema = z.object({
  name: z.string().max(200),
  description: z.string().max(2000).nullish(),
  discordUrl: z.string().max(500).nullish(),
  banner: z.string().max(4000),
  recruiting: z.boolean().optional(),
});

export async function POST(req: Request) {
  return handleCityRequest(req, async (userId) => {
    const body = await readBody(req, bodySchema);
    if (!body.ok) return body.response;
    const { id } = await createCity(userId, body.data);
    return jsonResponse({ id }, 201);
  });
}
