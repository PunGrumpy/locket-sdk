# locket-api

> Unofficial TypeScript SDK for the [Locket Camera (1020x1020)](https://locket.camera/) API.
> One class, every endpoint. Sign in, fetch friends, read your feed, react to moments — from Node.js or any modern JavaScript runtime.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

This SDK is **not published to npm yet**. To use it:

```bash
# clone the repo
git clone <repo-url>
cd locket-api

# install runtime + dev deps (axios is the only runtime dep)
npm install
```

Then import from inside the repo:

```ts
import { Locket } from "./src";
```

…or wire it into your own project via [`npm link`](https://docs.npmjs.com/cli/v10/commands/npm-link)
or a [`file:`](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#local-paths) dependency.

> ⚠️ **Disclaimer** — Not affiliated with, endorsed by, or sponsored by Locket
> Camera Inc. This wraps the **private** mobile API for educational and
> personal-automation purposes only. Use at your own risk and respect Locket's
> terms of service.

---

## Table of contents

- [Quick start](#quick-start)
  - [Seeing every field of a response](#seeing-every-field-of-a-response)
- [API at a glance](#api-at-a-glance)
- [Configuration](#configuration)
  - [Importable types](#importable-types)
- [Authentication](#authentication)
  - [`signInWithEmail`](#signinwithemailemail-password)
  - [`signInWithPhone`](#signinwithphonephone-password)
  - [`signInWithPhonePassword`](#signinwithphonepasswordphone-password)
  - [`exchangeCustomToken`](#exchangecustomtokencustomtoken)
  - [`refreshToken`](#refreshtokenrefreshtoken)
  - [`getAccountInfo` / `getMe`](#getaccountinfoidtoken)
  - [Session helpers](#session-helpers)
- [Moments](#moments)
  - [`getLatestMoments`](#getlatestmomentsusers-options)
  - [`react`](#reactmomentuid-reaction)
  - [`deleteMoment`](#deletemomentmomentuid-owneruid-deleteglobally)
  - [`getMomentViews` ★ Gold](#getmomentviewsmomentuid--gold-only)
- [Users & friends](#users--friends)
  - [`fetchUser`](#fetchuseruseruid)
  - [`listFriends` / `listFriendsDetailed` / `listFriendsRaw`](#listfriendsuseruid)
- [Hardcoded values & defaults](#hardcoded-values--defaults)
- [Error handling](#error-handling)
- [Project layout](#project-layout)
- [Building & developing](#building--developing)

---

## Quick start

> Examples in this README import from `"locket-api"` — the future published
> name (and the value of `name` in `package.json`). Until published, replace it
> with `"./src"` or `"../src"` if you're working inside this repo. See
> [`examples/playground.ts`](./examples/playground.ts) for a fully-typed,
> ready-to-run reference that imports from `"../src"`.

```ts
import {
  Locket,
  LocketError,
  type GetLatestMomentsResponse,
  type ReactToMomentResponse,
} from "locket-api";

const locket = new Locket();

// 1) Sign in
await locket.signInWithEmail("you@example.com", "password");

// 2) Browse your friends' latest moments
const friends: string[] = await locket.listFriends();
const feed: GetLatestMomentsResponse = await locket.getLatestMoments(friends);

// 3) React to the first one with any text (emoji or plain text)
const moment = feed.result.data[0];
if (moment) {
  const res: ReactToMomentResponse = await locket.react(
    moment.canonical_uid,
    "Nice!",
  );
  if (res.result.status !== 200) {
    console.warn("react failed:", res.result.errors);
  }
}
```

### Seeing every field of a response

Several response bodies contain nested objects (`providerUserInfo`,
Firestore field maps, etc.). Node's default `console.log` truncates at depth
2 — use `console.dir` to inspect the full payload:

```ts
const info = await locket.getAccountInfo();
console.dir(info, { depth: null, maxArrayLength: null });
```

---

## API at a glance

| Group       | Method                                                          | Endpoint                                        |
| ----------- | --------------------------------------------------------------- | ----------------------------------------------- |
| **Auth**    | `signInWithEmail(email, password)`                              | `POST /verifyPassword` (Google IDT)             |
|             | `signInWithPhone(phone, password)`                              | `POST /signInWithPhonePassword` + `verifyCustomToken` |
|             | `signInWithPhonePassword(phone, password)`                      | `POST /signInWithPhonePassword`                 |
|             | `exchangeCustomToken(customToken)`                              | `POST /verifyCustomToken` (Google IDT)          |
|             | `refreshToken(refreshToken?)`                                   | `POST /securetoken/v1/token`                    |
|             | `getAccountInfo(idToken?)` · `getMe()`                          | `POST /getAccountInfo` (Google IDT)             |
|             | `getSession()` · `setSession(s)` · `isAuthenticated()` · `signOut()` | (in-memory)                                |
| **Moments** | `getLatestMoments(users?, options?)`                            | `POST /getLatestMomentV2`                       |
|             | `react(momentUid, reaction)`                                    | `POST /reactToMoment`                           |
|             | `deleteMoment(momentUid, ownerUid, deleteGlobally?)`            | `POST /deleteMomentV2`                          |
|             | `getMomentViews(momentUid)` ★ **Locket Gold**                   | `POST /getMomentViews`                          |
| **Users**   | `fetchUser(userUid)`                                            | `POST /fetchUserV2`                             |
| **Friends** | `listFriends(userUid?)`                                         | `GET /firestore … /users/{uid}/friends`         |
|             | `listFriendsDetailed(userUid?)` (parsed `Date`s)                | same as above                                   |
|             | `listFriendsRaw(userUid?)` (raw Firestore docs)                 | same as above                                   |

---

## Configuration

```ts
new Locket({
  session: { idToken, refreshToken },     // restore a previous session
  timeout: 20_000,                         // axios timeout in ms (default 30s)
  userAgent: "MyApp/1.0",                  // overrides default iOS UA
  defaultHeaders: { "x-app": "myapp" },    // attached to every request
  auth: {
    firebaseApiKey: "AIza...",             // override Locket's public key
    iosBundleId:    "com.example.MyApp",
    clientType:     "CLIENT_TYPE_ANDROID", // default is CLIENT_TYPE_IOS
  },
  friends: {
    projectId: "locket-4252a",             // Firestore project id
  },
});
```

`Locket` keeps an in-memory `AuthSession` (`idToken` + `refreshToken` +
computed `expiresAt`). After a successful sign-in, subsequent calls attach
`Authorization: Bearer <idToken>` to Locket-owned endpoints. Google identity
endpoints (`verifyPassword`, `verifyCustomToken`, `getAccountInfo`,
`securetoken/token`) authenticate via API-key query string — the SDK omits the
Bearer header for them automatically.

### Importable types

Every public method returns a fully-typed body — annotate explicitly when you
need to pass the response around:

```ts
import type {
  // Auth
  AuthSession,
  EmailSignInResponse,
  PhoneSignInResponse,
  PhoneSignInResult,
  VerifyCustomTokenResponse,
  RefreshTokenResponse,
  GetAccountInfoResponse,
  AccountInfoUser,
  ProviderUserInfo,
  LocketJwtPayload,
  // Moments
  Moment,
  FirestoreTimestamp,
  GetLatestMomentsResponse,
  ReactToMomentResponse,
  DeleteMomentResponse,
  GetMomentViewsResponse,
  MomentView,
  // Users & friends
  LocketUser,
  FetchUserResponse,
  Friend,
  FriendDocument,
  FriendDocumentFields,
  FirestoreListResponse,
  // SDK
  LocketOptions,
  GetLatestMomentsOptions,
} from "locket-api";
```

Also exported: `LocketError`, the constants `LOCKET_API_BASE_URL`,
`LOCKET_FIREBASE_API_KEY`, `LOCKET_FIREBASE_PROJECT_ID`, `DEFAULT_USER_AGENT`,
and utilities `decodeJwtPayload(token)` and `int64(value)`.

---

## Authentication

```
┌───────── PHONE FLOW ─────────┐         ┌── EMAIL FLOW ──┐
│  signInWithPhonePassword     │         │ verifyPassword │
│        ↓ result.token        │         │   ↓ idToken    │
│  verifyCustomToken           │         │   + refresh    │
│        ↓ idToken + refresh   │         │                │
└──────────────────────────────┘         └────────────────┘
                  └────────────┬─────────────┘
                               ▼
                     getAccountInfo  ←  idToken (1 h TTL)
                               ▼
                     securetoken/token  ←  refreshToken
```

### `signInWithEmail(email, password)`

**`POST https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPassword`**

One HTTP call. Populates the session.

```ts
const res = await locket.signInWithEmail("you@example.com", "password");
```

**Returns `EmailSignInResponse`**

```ts
{
  kind:           "identitytoolkit#VerifyPasswordResponse",
  localId:        "4YUPPNLIobR0ieQnH1V8DU7ZCVq1",   // uid
  email:          "you@example.com",
  displayName:    "Chokun ㅤ",
  idToken:        "eyJhbGciOi…",                    // Bearer token (1 h TTL)
  refreshToken:   "AMf-vBxq…",
  profilePicture: "https://firebasestorage.googleapis.com/.../profile_pic.webp",
  registered:     true,
  expiresIn:      "3600",
}
```

**Failure** — throws `LocketError` (HTTP 400, e.g. `INVALID_PASSWORD`,
`EMAIL_NOT_FOUND`).

### `signInWithPhone(phone, password)`

**Two calls under the hood:**
1. `POST https://api.locketcamera.com/signInWithPhonePassword`
2. `POST https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyCustomToken`

Returns **both raw bodies**. The session is populated; `uid` is extracted from
the resulting JWT.

```ts
const { phone, identity } = await locket.signInWithPhone("+66xxxxxxxxx", "password");

phone.result.token;        // raw Firebase custom token
identity.idToken;          // Bearer token
identity.refreshToken;
identity.expiresIn;        // "3600"
identity.isNewUser;
```

**Failure** — Locket responds HTTP 200 with `phone.result.status !== 200`
and no `token`. The SDK throws `LocketError` for you with the original body
attached.

### `signInWithPhonePassword(phone, password)`

**`POST https://api.locketcamera.com/signInWithPhonePassword`**

Low-level — only the first half of the phone flow. Returns the raw body and
does **not** touch the session.

```ts
const res = await locket.signInWithPhonePassword("+66xxxxxxxxx", "password");
res.result.token;   // present on success
res.result.status;  // 200 on success, 400 on bad credentials
```

### `exchangeCustomToken(customToken)`

**`POST https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyCustomToken`**

Exchange a Firebase custom token for `idToken` + `refreshToken`. Does **not**
mutate the session.

```ts
const res = await locket.exchangeCustomToken("eyJhbGciOi…");
res.idToken; res.refreshToken; res.expiresIn; res.isNewUser;
```

**Failure** — throws `LocketError` (HTTP 400, e.g. `INVALID_CUSTOM_TOKEN`).

### `refreshToken(refreshToken?)`

**`POST https://securetoken.googleapis.com/v1/token`**

Refreshes the session in place. Uses the stored refresh token by default.

```ts
const r = await locket.refreshToken();
r.id_token; r.refresh_token; r.expires_in; r.user_id; r.project_id;
```

**Failure** — throws `LocketError` (HTTP 400, `INVALID_REFRESH_TOKEN`).

### `getAccountInfo(idToken?)`

**`POST https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo`**

```ts
const info = await locket.getAccountInfo();
info.users[0]?.localId;
info.users[0]?.customAttributes; // e.g. '{"revenueCatEntitlements":["Gold"]}'
```

`getMe()` is shorthand for `(await getAccountInfo()).users[0]`:

```ts
const me = await locket.getMe();
me?.localId;  me?.email;  me?.phoneNumber;  me?.lastRefreshAt;
```

**Failure** — throws `LocketError` (HTTP 400, `INVALID_ID_TOKEN`).

### Session helpers

```ts
locket.isAuthenticated();
locket.getSession();              // AuthSession | null
locket.setSession({ idToken, refreshToken });
locket.signOut();
```

`AuthSession` shape:

```ts
{
  idToken: string;
  refreshToken: string;
  expiresIn?: string;     // "3600"
  expiresAt?: number;     // Date.now() + expiresIn*1000 — computed for you
  uid?: string;
}
```

**Auto-refresh pattern:**

```ts
async function ensureFresh(locket: Locket) {
  const s = locket.getSession();
  if (!s) throw new Error("Not signed in");
  if (s.expiresAt && s.expiresAt - Date.now() < 60_000) {
    await locket.refreshToken();
  }
}
```

---

## Moments

### `getLatestMoments(users?, options?)`

**`POST https://api.locketcamera.com/getLatestMomentV2`**

```ts
// All friends — server fans out
const feed = await locket.getLatestMoments();

// Specific friends, with paging and exclusions
const feed = await locket.getLatestMoments(["FRIEND_UID_1"], {
  excludedUsers:            ["BLOCKED_UID"],
  lastFetch:                Date.now() - 24 * 60 * 60 * 1000,
  syncToken:                "psSVRI9EWZ5sNMLu9PzQ",
  shouldCountMissedMoments: true,
});
```

**Returns `GetLatestMomentsResponse`**

```ts
// status: 200 → new moments are in result.data
{
  result: {
    data: [{
      canonical_uid: "0Xu4LoJHqArMknW6pisT",   // use this for react / delete
      user:          "5gGjaYuwU3Uw0qUMqVBTK5tMKy82",
      date:          { _seconds: 1779795374, _nanoseconds: 712000000 },
      md5:           "a6949936ec4f0052847abf8afc63b339",
      thumbnail_url: "https://firebasestorage.googleapis.com/.../thumb.webp",
      // image_url / video_url / caption / overlays / reactions when present
    }],
    missed_moments_count: 0,
    sync_token:           "0Xu4LoJHqArMknW6pisT",
    status:               200,
  },
}

// status: 304 → nothing new since the sync_token
{ result: { data: [], status: 304 } }
```

### `react(momentUid, reaction)`

**`POST https://api.locketcamera.com/reactToMoment`**

`reaction` accepts **any string** — emoji or plain text.

```ts
await locket.react("S5OkJabkyqK47v34YQRw", "😮");
await locket.react("S5OkJabkyqK47v34YQRw", "Nice photo");
await locket.react("S5OkJabkyqK47v34YQRw", "🔥🔥🔥");
```

**Returns `ReactToMomentResponse`**

```ts
// status: 200 → success
{ result: { data: ["S5OkJabkyqK47v34YQRw"], status: 200 } }

// status: 401 → not your friend / not signed in
{
  result: {
    errors: ["You don't have access to this moment"],
    status: 401,
  },
}
```

> `react` reports failures via the body — it does **not** throw a
> `LocketError`. Always check `result.status === 200`.

### `deleteMoment(momentUid, ownerUid, deleteGlobally?)`

**`POST https://api.locketcamera.com/deleteMomentV2`**

`deleteGlobally` defaults to `true` (remove for everyone). `false` removes the
moment only from your own feed.

```ts
const res = await locket.deleteMoment(
  "mKPhGseit5sdWTotqoIr",
  "4YUPPNLIobR0ieQnH1V8DU7ZCVq1",   // owner UID — usually your own
);
```

**Returns `DeleteMomentResponse`**

```ts
// Success — note: no `status` field
{ result: { data: ["mKPhGseit5sdWTotqoIr"] } }

// Failure
{ result: { errors: ["..."], status: 401 } }
```

> Locket appears to echo `moment_uid` back in `result.data` even if the
> moment didn't exist. Treat `result.errors` as the only reliable failure
> signal.

### `getMomentViews(momentUid)` ★ Gold only

**`POST https://api.locketcamera.com/getMomentViews`**

> **⚠️ Locket Gold required.** The SDK does not check your subscription —
> it just calls the endpoint. Verify your tier via `getMe()` →
> `customAttributes` (e.g. `{"revenueCatEntitlements":["Gold"]}`).

Returns the list of people who viewed one of **your own** moments.

```ts
const res = await locket.getMomentViews("QmNChcRmMwIZaMixQnG8");
```

**Returns `GetMomentViewsResponse`**

```ts
// status: 200
{ result: { data: { moment_views: [/* MomentView[] */], count: 0 }, status: 200 } }

// status: 404 → moment_uid does not exist
{ result: { errors: ["Moment not found"], status: 404 } }

// status: 401 → the moment exists but you are not its owner
{ result: { errors: ["User does not have access to this moment"], status: 401 } }
```

---

## Users & friends

### `fetchUser(userUid)`

**`POST https://api.locketcamera.com/fetchUserV2`**

```ts
const res = await locket.fetchUser("nWY9shBZbXRedPrnWokQewqYuHh2");
```

**Returns `FetchUserResponse`**

```ts
// status: 200 → success
{
  result: {
    data: {
      uid:                 "nWY9shBZbXRedPrnWokQewqYuHh2",
      first_name:          "CHAMPHOO",
      last_name:           "Inchan",
      badge:               null,        // or "locket_gold"
      profile_picture_url: "https://firebasestorage.googleapis.com/.../profile_pic.webp",
      temp:                false,
      username:            null,
    },
    status: 200,
  },
}

// status: 401 → no Bearer
{ result: { errors: ["Please sign in"], status: 401 } }

// status: 401 → not a friend (no access)
{ result: { errors: ["You don't have access to this user"], status: 401 } }
```

### `listFriends(userUid?)`

**`GET https://firestore.googleapis.com/v1/projects/locket-4252a/databases/(default)/documents/users/{uid}/friends`**

Flat list of friend UIDs. Defaults to the signed-in user.

```ts
const uids = await locket.listFriends();
// ["5gGjaYuwU3Uw0qUMqVBTK5tMKy82", "8VWAASsyRWRBVuxZ0LhnNxCMjwb2", …]
```

### `listFriendsDetailed(userUid?)`

Parsed timestamps + `shared_history_on` (when the friend opted in to sharing
past moments).

```ts
const friends = await locket.listFriendsDetailed();
friends[0];
// {
//   uid:             "8VWAASsyRWRBVuxZ0LhnNxCMjwb2",
//   sharedHistoryOn: Date(2024-10-27T13:40:51.029Z),   // optional
//   createdAt:       Date(2024-10-27T13:39:25.675Z),
//   updatedAt:       Date(2024-10-27T13:40:51.051Z),
// }
```

### `listFriendsRaw(userUid?)`

Untouched Firestore document list.

```ts
const raw = await locket.listFriendsRaw();
raw.documents?.[0]?.fields.user.stringValue;
raw.documents?.[0]?.fields.shared_history_on?.timestampValue;
```

**Failure (all three)** — HTTP 401 thrown as `LocketError` (`UNAUTHENTICATED`).
Firestore expects a fresh Firebase ID token — call `refreshToken()` and retry.

---

## Hardcoded values & defaults

For transparency, here's everything the SDK fills in for you. Each row is
either fully fixed (the API only accepts one value) or configurable via the
`Locket` constructor.

| Field                              | Default                                                    | How to override                                |
| ---------------------------------- | ---------------------------------------------------------- | ---------------------------------------------- |
| `User-Agent`                       | `com.locket.Locket.LocketWidget/1.100.0 iPhone/18.2 …`     | `new Locket({ userAgent })`                    |
| `x-ios-bundle-identifier`          | `com.locket.Locket`                                        | `new Locket({ auth: { iosBundleId } })`        |
| Firebase API key (`?key=`)         | `AIzaSyCQngaaXQIfJaH0aS2l7REgIjD7nL431So`                  | `new Locket({ auth: { firebaseApiKey } })`     |
| Firestore project                  | `locket-4252a`                                             | `new Locket({ friends: { projectId } })`       |
| `clientType` (sign-in)             | `CLIENT_TYPE_IOS`                                          | `new Locket({ auth: { clientType } })`         |
| `returnSecureToken`                | `true` (always)                                            | not exposed — fixed                            |
| `grantType` (refresh)              | `"refresh_token"` (always)                                 | not exposed — fixed                            |
| `should_count_missed_moments`      | `true`                                                     | `getLatestMoments(_, { shouldCountMissedMoments })` |
| `delete_globally`                  | `true`                                                     | `deleteMoment(_, _, false)`                    |

---

## Error handling

There are two failure styles to know about:

1. **HTTP-level errors** (`verifyPassword`, `verifyCustomToken`,
   `getAccountInfo`, `securetoken/token`, Firestore) — normalized to a thrown
   `LocketError`. The error carries `.status`, `.code`, `.message`, and the
   raw upstream body in `.response`.
2. **Body-level errors** (`fetchUser`, `react`, `deleteMoment`,
   `getMomentViews`) — Locket returns HTTP 200 with an error in the response
   body. The SDK does **not** throw; the body comes back as the normal return
   value and you check `result.status` and `result.errors` yourself.

```ts
import { Locket, LocketError } from "locket-api";

const locket = new Locket();

try {
  await locket.signInWithEmail("you@example.com", "password");
} catch (err) {
  if (err instanceof LocketError) {
    // HTTP-level failure
    console.error(err.status, err.code, err.message, err.response);
  } else {
    throw err;
  }
}

// Body-level failure — no throw
const res = await locket.fetchUser("some-uid");
if (res.result.status !== 200) {
  console.warn("fetchUser failed:", res.result.errors);
}
```

**Failure-surface cheat sheet:**

| Endpoint                                                                 | How failure surfaces        |
| ------------------------------------------------------------------------ | --------------------------- |
| `verifyPassword`, `verifyCustomToken`, `getAccountInfo`, `securetoken/token`, `firestore` | HTTP 4xx → throws `LocketError`            |
| `signInWithPhonePassword` (via `signInWithPhone`)                        | HTTP 200, inner `status !== 200` → SDK throws `LocketError` |
| `fetchUser`, `react`, `deleteMoment`, `getMomentViews`                   | HTTP 200, body contains `result.errors` → SDK **returns** the body |

---

## Project layout

```
src/
├── index.ts               # public entry
├── locket.ts              # Locket — the single class users interact with
├── http.ts                # axios wrapper + auth interceptor
├── session.ts             # in-memory SessionStore
├── errors.ts              # LocketError
├── utils.ts               # int64 + JWT decoder
├── constants.ts
├── modules/               # internal — one file per endpoint group
│   ├── auth.ts
│   ├── moments.ts
│   ├── users.ts
│   └── friends.ts
└── types/
    ├── auth.ts
    ├── moment.ts
    ├── user.ts
    └── common.ts
```

---

## Building & developing

```bash
npm install          # runtime + dev deps (axios is the only runtime dep)

npm run dev          # tsx watch examples/playground.ts (hot reload)
npm start            # tsx examples/playground.ts (one-shot)
npm run build        # emits ./dist (CJS + .d.ts)
npm run build:watch  # tsc --watch
npm run typecheck    # tsc --noEmit
```

For `npm run dev`, edit `examples/playground.ts` and put your Locket
credentials at the top — it reloads on save. The playground prints every
endpoint's full response body via `console.dir(_, { depth: null })`.

---

## Contributing

PRs welcome. When adding a new endpoint:

1. Add request/response types under `src/types/`.
2. Implement the call in the right `src/modules/*.ts`.
3. Add an ergonomic positional-args method to `src/locket.ts`.
4. Add a section to this README using the per-endpoint template
   (URL, description, example, returns, failure).

---

## License

[MIT](LICENSE)
