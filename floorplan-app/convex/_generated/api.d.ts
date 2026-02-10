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
import type * as auth from "../auth.js";
import type * as collections from "../collections.js";
import type * as crons from "../crons.js";
import type * as explore from "../explore.js";
import type * as lib_auditLog from "../lib/auditLog.js";
import type * as lib_auth from "../lib/auth.js";
import type * as projects from "../projects.js";
import type * as sharing from "../sharing.js";
import type * as topics from "../topics.js";
import type * as trending from "../trending.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  collections: typeof collections;
  crons: typeof crons;
  explore: typeof explore;
  "lib/auditLog": typeof lib_auditLog;
  "lib/auth": typeof lib_auth;
  projects: typeof projects;
  sharing: typeof sharing;
  topics: typeof topics;
  trending: typeof trending;
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

export declare const components: {
  adminAuditLog: {
    lib: {
      listDocumentHistory: FunctionReference<
        "query",
        "internal",
        {
          id: string;
          maxTs: number;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            attribution: any;
            doc: any;
            id: string;
            isDeleted: boolean;
            ts: number;
          }>;
        }
      >;
      listHistory: FunctionReference<
        "query",
        "internal",
        {
          maxTs: number;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            attribution: any;
            doc: any;
            id: string;
            isDeleted: boolean;
            ts: number;
          }>;
        }
      >;
      listSnapshot: FunctionReference<
        "query",
        "internal",
        {
          currentTs: number;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          snapshotTs: number;
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            attribution: any;
            doc: any;
            id: string;
            isDeleted: boolean;
            ts: number;
          }>;
          pageStatus?: "SplitRecommended";
          splitCursor?: string;
        }
      >;
      update: FunctionReference<
        "mutation",
        "internal",
        {
          attribution: any;
          doc: any | null;
          id: string;
          serializability: "table" | "document" | "wallclock";
        },
        number
      >;
      vacuumHistory: FunctionReference<
        "mutation",
        "internal",
        { minTsToKeep: number },
        any
      >;
    };
  };
};
