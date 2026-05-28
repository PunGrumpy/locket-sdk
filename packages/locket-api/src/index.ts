export { Locket } from "./locket";
export type { LocketOptions, GetLatestMomentsOptions } from "./locket";

export type { FriendDocument, FriendDocumentFields, FirestoreListResponse } from "./modules";

export { LocketError } from "./errors";

export {
  LOCKET_API_BASE_URL,
  LOCKET_FIREBASE_API_KEY,
  LOCKET_FIREBASE_PROJECT_ID,
  DEFAULT_USER_AGENT,
} from "./constants";

export * from "./types";

export { decodeJwtPayload, int64 } from "./utils";

import { Locket } from "./locket";
export default Locket;
