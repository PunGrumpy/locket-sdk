/**
 * locket-api — end-to-end usage example.
 *
 * Every endpoint the SDK exposes is exercised here. Every variable has an
 * explicit type annotation, and every response body is printed in full via
 * `console.dir(_, { depth: null })` so nothing is truncated.
 *
 * Edit the credentials below and run `npm run dev` (hot reload) or `npm start`.
 */
import {
  Locket,
  LocketError,
  type AccountInfoUser,
  type AuthSession,
  type EmailSignInResponse,
  type FetchUserResponse,
  type FirestoreListResponse,
  type Friend,
  type GetAccountInfoResponse,
  type GetLatestMomentsResponse,
  type GetMomentViewsResponse,
  type PhoneSignInResult,
  type ReactToMomentResponse,
  type RefreshTokenResponse,
  type VerifyCustomTokenResponse,
} from "locket-api";

// ───── Credentials ─────────────────────────────────────────────────────
// Fill in either email + password OR phone + password.
const EMAIL: string | null = null;
const PHONE: string | null = "+66xxxxxxxxx";
const PASSWORD = "password_here";

// ───── Output helper ───────────────────────────────────────────────────
function dump(label: string, value: unknown): void {
  console.log(`\n── ${label} ──`);
  console.dir(value, { depth: null, colors: true, maxArrayLength: null });
}

async function main(): Promise<void> {
  const locket: Locket = new Locket();

  try {
    // 1) Sign in ──────────────────────────────────────────────────────────
    if (EMAIL) {
      const res: EmailSignInResponse = await locket.signInWithEmail(EMAIL, PASSWORD);
      dump("signInWithEmail", res);
    } else if (PHONE) {
      const res: PhoneSignInResult = await locket.signInWithPhone(PHONE, PASSWORD);
      dump("signInWithPhone", res);
    } else {
      console.log("No credentials set in playground.ts — exiting.");
      return;
    }

    const session: AuthSession | null = locket.getSession();
    dump("session", session);
    // 2) Account info ───────────────────────────────────────────────────
    const accountInfo: GetAccountInfoResponse = await locket.getAccountInfo();
    dump("getAccountInfo", accountInfo);

    const me: AccountInfoUser | undefined = await locket.getMe();
    dump("getMe", me);

    // 3) Friends ────────────────────────────────────────────────────────
    const uids: string[] = await locket.listFriends();
    dump("listFriends", uids);

    const friends: Friend[] = await locket.listFriendsDetailed();
    dump("listFriendsDetailed", friends);

    const rawFriends: FirestoreListResponse = await locket.listFriendsRaw();
    dump("listFriendsRaw", rawFriends);

    if (friends.length === 0) return;

    // 4) fetchUser ──────────────────────────────────────────────────────
    const userRes: FetchUserResponse = await locket.fetchUser(friends[0]!.uid);
    dump(`fetchUser(${friends[0]!.uid})`, userRes);

    // 5) getLatestMoments ───────────────────────────────────────────────
    const feed: GetLatestMomentsResponse = await locket.getLatestMoments(friends.map((f) => f.uid));
    dump("getLatestMoments", feed);

    // 6) getMomentViews (Locket Gold — expect 401 on a friend's moment) ──
    const moment = feed.result.data[0];
    if (moment) {
      const views: GetMomentViewsResponse = await locket.getMomentViews(moment.canonical_uid);
      dump(`getMomentViews(${moment.canonical_uid})`, views);
    }

    // 7) Destructive examples (left commented for safety) ──────────────
    // const reactRes: ReactToMomentResponse = await locket.react(moment!.canonical_uid, "Nice photo");
    // dump("react", reactRes);
    //
    // const deleteRes = await locket.deleteMoment("OWN_MOMENT_UID", session!.uid!);
    // dump("deleteMoment", deleteRes);
    //
    // const refreshed: RefreshTokenResponse = await locket.refreshToken();
    // dump("refreshToken", refreshed);
    //
    // const exchanged: VerifyCustomTokenResponse = await locket.exchangeCustomToken("CUSTOM_TOKEN");
    // dump("exchangeCustomToken", exchanged);

    // Reference the types above so the commented examples still type-check:
    void (null as unknown as ReactToMomentResponse);
    void (null as unknown as RefreshTokenResponse);
    void (null as unknown as VerifyCustomTokenResponse);
  } catch (err) {
    if (err instanceof LocketError) {
      console.error(`\n❌ LocketError ${err.status ?? "—"} (${err.code ?? "—"}): ${err.message}`);
      if (err.response) dump("err.response", err.response);
    } else {
      throw err;
    }
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
