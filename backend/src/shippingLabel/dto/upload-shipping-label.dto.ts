import { ReqId } from "src/common/utils/dto.helpers";

export class UploadShippingLabelDto {
  @ReqId() orderId: string;
  @ReqId() product_id: string;
}
