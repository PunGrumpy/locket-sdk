import { FIRESTORE_URL, LOCKET_FIREBASE_PROJECT_ID } from "../constants";
import { HttpClient } from "../http";
import { SessionStore } from "../session";
import type { RequestOptions } from "../types/common";
import type { Friend } from "../types/user";

/** Typed shape of the Firestore document for `users/{uid}/friends/{friendUid}`. */
export interface FriendDocumentFields {
  user: { stringValue: string };
  shared_history_on?: { timestampValue: string };
}

export interface FriendDocument {
  /** Full Firestore resource name. The last path segment is the friend UID. */
  name: string;
  fields: FriendDocumentFields;
  createTime: string;
  updateTime: string;
}

export interface FirestoreListResponse {
  documents?: FriendDocument[];
  nextPageToken?: string;
}

export interface FriendsModuleOptions {
  projectId?: string;
}

function parseTimestamp(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const ts = new Date(value);
  return Number.isNaN(ts.getTime()) ? undefined : ts;
}

function parseFriendDocument(doc: FriendDocument): Friend {
  const uid = doc.fields?.user?.stringValue ?? doc.name.split("/").pop() ?? "";
  return {
    uid,
    sharedHistoryOn: parseTimestamp(
      doc.fields?.shared_history_on?.timestampValue
    ),
    createdAt: parseTimestamp(doc.createTime),
    updatedAt: parseTimestamp(doc.updateTime),
  };
}

export class FriendsModule {
  private readonly projectId: string;

  constructor(
    private readonly http: HttpClient,
    private readonly session: SessionStore,
    options: FriendsModuleOptions = {}
  ) {
    this.projectId = options.projectId ?? LOCKET_FIREBASE_PROJECT_ID;
  }

  /**
   * List friends of the given user (defaults to the signed-in user).
   * Returns the raw Firestore document list — useful when you need
   * field-level metadata (createTime, updateTime, etc.).
   */
  async listRaw(userUid?: string, options?: RequestOptions) {
    const uid = userUid ?? this.session.get()?.uid;
    if (!uid) throw new Error("Cannot list friends without a user UID");

    const path = `/v1/projects/${this.projectId}/databases/(default)/documents/users/${uid}/friends`;
    return this.http.get<FirestoreListResponse>(`${FIRESTORE_URL}${path}`, {
      headers: options?.headers,
      signal: options?.signal,
    });
  }

  /** Flat list of friend UIDs. */
  async listUids(
    userUid?: string,
    options?: RequestOptions
  ): Promise<string[]> {
    const response = await this.listRaw(userUid, options);
    if (!response.documents) return [];
    return response.documents
      .map((doc) => doc.fields?.user?.stringValue ?? doc.name?.split("/").pop())
      .filter((uid): uid is string => Boolean(uid));
  }

  /**
   * Parsed friend list — each entry has `uid`, `sharedHistoryOn`,
   * `createdAt`, `updatedAt` as proper `Date` objects.
   */
  async listDetailed(
    userUid?: string,
    options?: RequestOptions
  ): Promise<Friend[]> {
    const response = await this.listRaw(userUid, options);
    return (response.documents ?? []).map(parseFriendDocument);
  }
}
