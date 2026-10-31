/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as alerts from "../alerts.js";
import type * as auth from "../auth.js";
import type * as cosmetics from "../cosmetics.js";
import type * as emailOtp from "../emailOtp.js";
import type * as games from "../games.js";
import type * as http from "../http.js";
import type * as lib from "../lib.js";
import type * as play from "../play.js";
import type * as push from "../push.js";
import type * as radio from "../radio.js";
import type * as rounds from "../rounds.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  alerts: typeof alerts;
  auth: typeof auth;
  cosmetics: typeof cosmetics;
  emailOtp: typeof emailOtp;
  games: typeof games;
  http: typeof http;
  lib: typeof lib;
  play: typeof play;
  push: typeof push;
  radio: typeof radio;
  rounds: typeof rounds;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
