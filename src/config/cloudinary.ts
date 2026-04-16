import { Environment } from "@/core/utils/EnvValidator";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: Environment.CLOUDINARY_CLOUD_NAME,
  api_key: Environment.CLOUDINARY_API_KEY,
  api_secret: Environment.CLOUDINARY_API_SECRET,
});

export default cloudinary;
