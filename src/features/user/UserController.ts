import cloudinary from "@/config/cloudinary";
import { Services } from "@/core/di/types";
import { BaseController } from "@/core/http/BaseController";
import { responseWrapper } from "@/core/http/responseWrapper";
import { z } from "zod";
import { encodeBase64 } from "hono/utils/encode";

const updateUserSchema = z.object({
  name: z.string().min(3).max(50).optional(),
  avatar_url: z.string().url().optional(),
});

export class UserController extends BaseController {
  constructor(private readonly deps: Services) {
    super("UserService");
  }
  getUserById = responseWrapper({
    action: "get_user_by_id",
    builder: this.builder,
    successMsg: "User Found",
    errorMsg: "User does not exist",
    handler: async (ctx) => {
      if (!ctx.get("user")) {
        throw new Error("Please Provided the token");
      }
      const params = ctx.req.param("user_id");
      const user = await this.deps.userServices.checkUserExist({
        key: "id",
        value: Number(params),
      });

      if (!user) {
        throw new Error("User does not exist");
      }
      const { password, ...rest } = user;
      return rest;
    },
  });

  editUserDetails = responseWrapper({
    action: "edit_user_details",
    builder: this.builder,
    errorMsg: "Not able to edit",
    successMsg: "User Details Updated Successfully",
    handler: async (ctx) => {
      const userData = ctx.get("user");
      if (!userData) {
        throw new Error("User not found");
      }
      const data = await ctx.req.formData();
      const name = data.get("name");
      const avatar = data.get("file");

      let avatar_url: string | null = null;

      if (avatar && avatar instanceof File) {
        await cloudinary.api.delete_resources_by_prefix(
          `user_avatar_${userData.id}`,
          {
            invalidate: true,
          }
        );

        const buffer = await avatar.arrayBuffer();
        const base64 = encodeBase64(buffer);
        const uploadFile = await cloudinary.uploader.upload(
          `data:image/png;base64,${base64}`,
          {
            folder: `user_avatar_${userData.id}`,
          }
        );
        avatar_url = uploadFile.secure_url;
      }

      const parseData = updateUserSchema.safeParse({
        name,
        avatar_url,
      });
      if (!parseData.success) {
        throw parseData.success;
      }
      const updatedData = Object.fromEntries(
        Object.entries(parseData.data).filter(([_, value]) => value !== "")
      );

      return await this.deps.userServices.updateUserDetails({
        id: userData.id,
        updates: updatedData,
      });
    },
  });
}
