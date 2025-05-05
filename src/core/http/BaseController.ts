import { ResponseBuilder } from "@/core/utils/ResponseBuilder";

export class BaseController {
  protected builder: ResponseBuilder;

  constructor(serviceName: string) {
    this.builder = new ResponseBuilder(serviceName);
  }
}
