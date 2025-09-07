
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model Organization
 * 
 */
export type Organization = $Result.DefaultSelection<Prisma.$OrganizationPayload>
/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model PlatformAdmin
 * 
 */
export type PlatformAdmin = $Result.DefaultSelection<Prisma.$PlatformAdminPayload>
/**
 * Model AdminAuditLog
 * 
 */
export type AdminAuditLog = $Result.DefaultSelection<Prisma.$AdminAuditLogPayload>
/**
 * Model SystemConfig
 * 
 */
export type SystemConfig = $Result.DefaultSelection<Prisma.$SystemConfigPayload>
/**
 * Model AdminSession
 * 
 */
export type AdminSession = $Result.DefaultSelection<Prisma.$AdminSessionPayload>
/**
 * Model Subscription
 * 
 */
export type Subscription = $Result.DefaultSelection<Prisma.$SubscriptionPayload>
/**
 * Model BillingEvent
 * 
 */
export type BillingEvent = $Result.DefaultSelection<Prisma.$BillingEventPayload>
/**
 * Model RevenueMetric
 * 
 */
export type RevenueMetric = $Result.DefaultSelection<Prisma.$RevenueMetricPayload>
/**
 * Model StripeConfig
 * 
 */
export type StripeConfig = $Result.DefaultSelection<Prisma.$StripeConfigPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const AdminRole: {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  VIEWER: 'VIEWER',
  SUPPORT: 'SUPPORT'
};

export type AdminRole = (typeof AdminRole)[keyof typeof AdminRole]


export const SubscriptionPlan: {
  FREE: 'FREE',
  STARTER: 'STARTER',
  PROFESSIONAL: 'PROFESSIONAL',
  ENTERPRISE: 'ENTERPRISE',
  CUSTOM: 'CUSTOM'
};

export type SubscriptionPlan = (typeof SubscriptionPlan)[keyof typeof SubscriptionPlan]


export const SubscriptionStatus: {
  TRIALING: 'TRIALING',
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  CANCELED: 'CANCELED',
  UNPAID: 'UNPAID',
  INCOMPLETE: 'INCOMPLETE',
  INCOMPLETE_EXPIRED: 'INCOMPLETE_EXPIRED'
};

export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus]


export const BillingEventType: {
  SUBSCRIPTION_CREATED: 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_UPDATED: 'SUBSCRIPTION_UPDATED',
  SUBSCRIPTION_CANCELED: 'SUBSCRIPTION_CANCELED',
  INVOICE_PAYMENT_SUCCEEDED: 'INVOICE_PAYMENT_SUCCEEDED',
  INVOICE_PAYMENT_FAILED: 'INVOICE_PAYMENT_FAILED',
  PAYMENT_METHOD_ATTACHED: 'PAYMENT_METHOD_ATTACHED',
  PAYMENT_METHOD_DETACHED: 'PAYMENT_METHOD_DETACHED',
  CUSTOMER_CREATED: 'CUSTOMER_CREATED',
  CUSTOMER_UPDATED: 'CUSTOMER_UPDATED',
  TRIAL_STARTED: 'TRIAL_STARTED',
  TRIAL_ENDED: 'TRIAL_ENDED',
  CHURN_RISK_DETECTED: 'CHURN_RISK_DETECTED'
};

export type BillingEventType = (typeof BillingEventType)[keyof typeof BillingEventType]


export const MetricPeriod: {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  YEARLY: 'YEARLY'
};

export type MetricPeriod = (typeof MetricPeriod)[keyof typeof MetricPeriod]

}

export type AdminRole = $Enums.AdminRole

export const AdminRole: typeof $Enums.AdminRole

export type SubscriptionPlan = $Enums.SubscriptionPlan

export const SubscriptionPlan: typeof $Enums.SubscriptionPlan

export type SubscriptionStatus = $Enums.SubscriptionStatus

export const SubscriptionStatus: typeof $Enums.SubscriptionStatus

export type BillingEventType = $Enums.BillingEventType

export const BillingEventType: typeof $Enums.BillingEventType

export type MetricPeriod = $Enums.MetricPeriod

export const MetricPeriod: typeof $Enums.MetricPeriod

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Organizations
 * const organizations = await prisma.organization.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Organizations
   * const organizations = await prisma.organization.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.organization`: Exposes CRUD operations for the **Organization** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Organizations
    * const organizations = await prisma.organization.findMany()
    * ```
    */
  get organization(): Prisma.OrganizationDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.platformAdmin`: Exposes CRUD operations for the **PlatformAdmin** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more PlatformAdmins
    * const platformAdmins = await prisma.platformAdmin.findMany()
    * ```
    */
  get platformAdmin(): Prisma.PlatformAdminDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.adminAuditLog`: Exposes CRUD operations for the **AdminAuditLog** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AdminAuditLogs
    * const adminAuditLogs = await prisma.adminAuditLog.findMany()
    * ```
    */
  get adminAuditLog(): Prisma.AdminAuditLogDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.systemConfig`: Exposes CRUD operations for the **SystemConfig** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more SystemConfigs
    * const systemConfigs = await prisma.systemConfig.findMany()
    * ```
    */
  get systemConfig(): Prisma.SystemConfigDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.adminSession`: Exposes CRUD operations for the **AdminSession** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AdminSessions
    * const adminSessions = await prisma.adminSession.findMany()
    * ```
    */
  get adminSession(): Prisma.AdminSessionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.subscription`: Exposes CRUD operations for the **Subscription** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Subscriptions
    * const subscriptions = await prisma.subscription.findMany()
    * ```
    */
  get subscription(): Prisma.SubscriptionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.billingEvent`: Exposes CRUD operations for the **BillingEvent** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more BillingEvents
    * const billingEvents = await prisma.billingEvent.findMany()
    * ```
    */
  get billingEvent(): Prisma.BillingEventDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.revenueMetric`: Exposes CRUD operations for the **RevenueMetric** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more RevenueMetrics
    * const revenueMetrics = await prisma.revenueMetric.findMany()
    * ```
    */
  get revenueMetric(): Prisma.RevenueMetricDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.stripeConfig`: Exposes CRUD operations for the **StripeConfig** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more StripeConfigs
    * const stripeConfigs = await prisma.stripeConfig.findMany()
    * ```
    */
  get stripeConfig(): Prisma.StripeConfigDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.15.0
   * Query Engine version: 85179d7826409ee107a6ba334b5e305ae3fba9fb
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    Organization: 'Organization',
    User: 'User',
    PlatformAdmin: 'PlatformAdmin',
    AdminAuditLog: 'AdminAuditLog',
    SystemConfig: 'SystemConfig',
    AdminSession: 'AdminSession',
    Subscription: 'Subscription',
    BillingEvent: 'BillingEvent',
    RevenueMetric: 'RevenueMetric',
    StripeConfig: 'StripeConfig'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "organization" | "user" | "platformAdmin" | "adminAuditLog" | "systemConfig" | "adminSession" | "subscription" | "billingEvent" | "revenueMetric" | "stripeConfig"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      Organization: {
        payload: Prisma.$OrganizationPayload<ExtArgs>
        fields: Prisma.OrganizationFieldRefs
        operations: {
          findUnique: {
            args: Prisma.OrganizationFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.OrganizationFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload>
          }
          findFirst: {
            args: Prisma.OrganizationFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.OrganizationFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload>
          }
          findMany: {
            args: Prisma.OrganizationFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload>[]
          }
          create: {
            args: Prisma.OrganizationCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload>
          }
          createMany: {
            args: Prisma.OrganizationCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.OrganizationCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload>[]
          }
          delete: {
            args: Prisma.OrganizationDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload>
          }
          update: {
            args: Prisma.OrganizationUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload>
          }
          deleteMany: {
            args: Prisma.OrganizationDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.OrganizationUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.OrganizationUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload>[]
          }
          upsert: {
            args: Prisma.OrganizationUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload>
          }
          aggregate: {
            args: Prisma.OrganizationAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateOrganization>
          }
          groupBy: {
            args: Prisma.OrganizationGroupByArgs<ExtArgs>
            result: $Utils.Optional<OrganizationGroupByOutputType>[]
          }
          count: {
            args: Prisma.OrganizationCountArgs<ExtArgs>
            result: $Utils.Optional<OrganizationCountAggregateOutputType> | number
          }
        }
      }
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      PlatformAdmin: {
        payload: Prisma.$PlatformAdminPayload<ExtArgs>
        fields: Prisma.PlatformAdminFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PlatformAdminFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlatformAdminPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PlatformAdminFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlatformAdminPayload>
          }
          findFirst: {
            args: Prisma.PlatformAdminFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlatformAdminPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PlatformAdminFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlatformAdminPayload>
          }
          findMany: {
            args: Prisma.PlatformAdminFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlatformAdminPayload>[]
          }
          create: {
            args: Prisma.PlatformAdminCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlatformAdminPayload>
          }
          createMany: {
            args: Prisma.PlatformAdminCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.PlatformAdminCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlatformAdminPayload>[]
          }
          delete: {
            args: Prisma.PlatformAdminDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlatformAdminPayload>
          }
          update: {
            args: Prisma.PlatformAdminUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlatformAdminPayload>
          }
          deleteMany: {
            args: Prisma.PlatformAdminDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.PlatformAdminUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.PlatformAdminUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlatformAdminPayload>[]
          }
          upsert: {
            args: Prisma.PlatformAdminUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlatformAdminPayload>
          }
          aggregate: {
            args: Prisma.PlatformAdminAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePlatformAdmin>
          }
          groupBy: {
            args: Prisma.PlatformAdminGroupByArgs<ExtArgs>
            result: $Utils.Optional<PlatformAdminGroupByOutputType>[]
          }
          count: {
            args: Prisma.PlatformAdminCountArgs<ExtArgs>
            result: $Utils.Optional<PlatformAdminCountAggregateOutputType> | number
          }
        }
      }
      AdminAuditLog: {
        payload: Prisma.$AdminAuditLogPayload<ExtArgs>
        fields: Prisma.AdminAuditLogFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AdminAuditLogFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminAuditLogPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AdminAuditLogFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminAuditLogPayload>
          }
          findFirst: {
            args: Prisma.AdminAuditLogFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminAuditLogPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AdminAuditLogFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminAuditLogPayload>
          }
          findMany: {
            args: Prisma.AdminAuditLogFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminAuditLogPayload>[]
          }
          create: {
            args: Prisma.AdminAuditLogCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminAuditLogPayload>
          }
          createMany: {
            args: Prisma.AdminAuditLogCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AdminAuditLogCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminAuditLogPayload>[]
          }
          delete: {
            args: Prisma.AdminAuditLogDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminAuditLogPayload>
          }
          update: {
            args: Prisma.AdminAuditLogUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminAuditLogPayload>
          }
          deleteMany: {
            args: Prisma.AdminAuditLogDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AdminAuditLogUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AdminAuditLogUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminAuditLogPayload>[]
          }
          upsert: {
            args: Prisma.AdminAuditLogUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminAuditLogPayload>
          }
          aggregate: {
            args: Prisma.AdminAuditLogAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAdminAuditLog>
          }
          groupBy: {
            args: Prisma.AdminAuditLogGroupByArgs<ExtArgs>
            result: $Utils.Optional<AdminAuditLogGroupByOutputType>[]
          }
          count: {
            args: Prisma.AdminAuditLogCountArgs<ExtArgs>
            result: $Utils.Optional<AdminAuditLogCountAggregateOutputType> | number
          }
        }
      }
      SystemConfig: {
        payload: Prisma.$SystemConfigPayload<ExtArgs>
        fields: Prisma.SystemConfigFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SystemConfigFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemConfigPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SystemConfigFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemConfigPayload>
          }
          findFirst: {
            args: Prisma.SystemConfigFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemConfigPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SystemConfigFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemConfigPayload>
          }
          findMany: {
            args: Prisma.SystemConfigFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemConfigPayload>[]
          }
          create: {
            args: Prisma.SystemConfigCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemConfigPayload>
          }
          createMany: {
            args: Prisma.SystemConfigCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SystemConfigCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemConfigPayload>[]
          }
          delete: {
            args: Prisma.SystemConfigDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemConfigPayload>
          }
          update: {
            args: Prisma.SystemConfigUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemConfigPayload>
          }
          deleteMany: {
            args: Prisma.SystemConfigDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SystemConfigUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.SystemConfigUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemConfigPayload>[]
          }
          upsert: {
            args: Prisma.SystemConfigUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemConfigPayload>
          }
          aggregate: {
            args: Prisma.SystemConfigAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSystemConfig>
          }
          groupBy: {
            args: Prisma.SystemConfigGroupByArgs<ExtArgs>
            result: $Utils.Optional<SystemConfigGroupByOutputType>[]
          }
          count: {
            args: Prisma.SystemConfigCountArgs<ExtArgs>
            result: $Utils.Optional<SystemConfigCountAggregateOutputType> | number
          }
        }
      }
      AdminSession: {
        payload: Prisma.$AdminSessionPayload<ExtArgs>
        fields: Prisma.AdminSessionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AdminSessionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminSessionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AdminSessionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminSessionPayload>
          }
          findFirst: {
            args: Prisma.AdminSessionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminSessionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AdminSessionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminSessionPayload>
          }
          findMany: {
            args: Prisma.AdminSessionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminSessionPayload>[]
          }
          create: {
            args: Prisma.AdminSessionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminSessionPayload>
          }
          createMany: {
            args: Prisma.AdminSessionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AdminSessionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminSessionPayload>[]
          }
          delete: {
            args: Prisma.AdminSessionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminSessionPayload>
          }
          update: {
            args: Prisma.AdminSessionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminSessionPayload>
          }
          deleteMany: {
            args: Prisma.AdminSessionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AdminSessionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AdminSessionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminSessionPayload>[]
          }
          upsert: {
            args: Prisma.AdminSessionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminSessionPayload>
          }
          aggregate: {
            args: Prisma.AdminSessionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAdminSession>
          }
          groupBy: {
            args: Prisma.AdminSessionGroupByArgs<ExtArgs>
            result: $Utils.Optional<AdminSessionGroupByOutputType>[]
          }
          count: {
            args: Prisma.AdminSessionCountArgs<ExtArgs>
            result: $Utils.Optional<AdminSessionCountAggregateOutputType> | number
          }
        }
      }
      Subscription: {
        payload: Prisma.$SubscriptionPayload<ExtArgs>
        fields: Prisma.SubscriptionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SubscriptionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SubscriptionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>
          }
          findFirst: {
            args: Prisma.SubscriptionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SubscriptionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>
          }
          findMany: {
            args: Prisma.SubscriptionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>[]
          }
          create: {
            args: Prisma.SubscriptionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>
          }
          createMany: {
            args: Prisma.SubscriptionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SubscriptionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>[]
          }
          delete: {
            args: Prisma.SubscriptionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>
          }
          update: {
            args: Prisma.SubscriptionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>
          }
          deleteMany: {
            args: Prisma.SubscriptionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SubscriptionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.SubscriptionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>[]
          }
          upsert: {
            args: Prisma.SubscriptionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>
          }
          aggregate: {
            args: Prisma.SubscriptionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSubscription>
          }
          groupBy: {
            args: Prisma.SubscriptionGroupByArgs<ExtArgs>
            result: $Utils.Optional<SubscriptionGroupByOutputType>[]
          }
          count: {
            args: Prisma.SubscriptionCountArgs<ExtArgs>
            result: $Utils.Optional<SubscriptionCountAggregateOutputType> | number
          }
        }
      }
      BillingEvent: {
        payload: Prisma.$BillingEventPayload<ExtArgs>
        fields: Prisma.BillingEventFieldRefs
        operations: {
          findUnique: {
            args: Prisma.BillingEventFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BillingEventPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.BillingEventFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BillingEventPayload>
          }
          findFirst: {
            args: Prisma.BillingEventFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BillingEventPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.BillingEventFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BillingEventPayload>
          }
          findMany: {
            args: Prisma.BillingEventFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BillingEventPayload>[]
          }
          create: {
            args: Prisma.BillingEventCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BillingEventPayload>
          }
          createMany: {
            args: Prisma.BillingEventCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.BillingEventCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BillingEventPayload>[]
          }
          delete: {
            args: Prisma.BillingEventDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BillingEventPayload>
          }
          update: {
            args: Prisma.BillingEventUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BillingEventPayload>
          }
          deleteMany: {
            args: Prisma.BillingEventDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.BillingEventUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.BillingEventUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BillingEventPayload>[]
          }
          upsert: {
            args: Prisma.BillingEventUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BillingEventPayload>
          }
          aggregate: {
            args: Prisma.BillingEventAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateBillingEvent>
          }
          groupBy: {
            args: Prisma.BillingEventGroupByArgs<ExtArgs>
            result: $Utils.Optional<BillingEventGroupByOutputType>[]
          }
          count: {
            args: Prisma.BillingEventCountArgs<ExtArgs>
            result: $Utils.Optional<BillingEventCountAggregateOutputType> | number
          }
        }
      }
      RevenueMetric: {
        payload: Prisma.$RevenueMetricPayload<ExtArgs>
        fields: Prisma.RevenueMetricFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RevenueMetricFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RevenueMetricPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RevenueMetricFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RevenueMetricPayload>
          }
          findFirst: {
            args: Prisma.RevenueMetricFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RevenueMetricPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RevenueMetricFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RevenueMetricPayload>
          }
          findMany: {
            args: Prisma.RevenueMetricFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RevenueMetricPayload>[]
          }
          create: {
            args: Prisma.RevenueMetricCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RevenueMetricPayload>
          }
          createMany: {
            args: Prisma.RevenueMetricCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RevenueMetricCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RevenueMetricPayload>[]
          }
          delete: {
            args: Prisma.RevenueMetricDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RevenueMetricPayload>
          }
          update: {
            args: Prisma.RevenueMetricUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RevenueMetricPayload>
          }
          deleteMany: {
            args: Prisma.RevenueMetricDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RevenueMetricUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.RevenueMetricUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RevenueMetricPayload>[]
          }
          upsert: {
            args: Prisma.RevenueMetricUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RevenueMetricPayload>
          }
          aggregate: {
            args: Prisma.RevenueMetricAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRevenueMetric>
          }
          groupBy: {
            args: Prisma.RevenueMetricGroupByArgs<ExtArgs>
            result: $Utils.Optional<RevenueMetricGroupByOutputType>[]
          }
          count: {
            args: Prisma.RevenueMetricCountArgs<ExtArgs>
            result: $Utils.Optional<RevenueMetricCountAggregateOutputType> | number
          }
        }
      }
      StripeConfig: {
        payload: Prisma.$StripeConfigPayload<ExtArgs>
        fields: Prisma.StripeConfigFieldRefs
        operations: {
          findUnique: {
            args: Prisma.StripeConfigFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StripeConfigPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.StripeConfigFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StripeConfigPayload>
          }
          findFirst: {
            args: Prisma.StripeConfigFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StripeConfigPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.StripeConfigFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StripeConfigPayload>
          }
          findMany: {
            args: Prisma.StripeConfigFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StripeConfigPayload>[]
          }
          create: {
            args: Prisma.StripeConfigCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StripeConfigPayload>
          }
          createMany: {
            args: Prisma.StripeConfigCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.StripeConfigCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StripeConfigPayload>[]
          }
          delete: {
            args: Prisma.StripeConfigDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StripeConfigPayload>
          }
          update: {
            args: Prisma.StripeConfigUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StripeConfigPayload>
          }
          deleteMany: {
            args: Prisma.StripeConfigDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.StripeConfigUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.StripeConfigUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StripeConfigPayload>[]
          }
          upsert: {
            args: Prisma.StripeConfigUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StripeConfigPayload>
          }
          aggregate: {
            args: Prisma.StripeConfigAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateStripeConfig>
          }
          groupBy: {
            args: Prisma.StripeConfigGroupByArgs<ExtArgs>
            result: $Utils.Optional<StripeConfigGroupByOutputType>[]
          }
          count: {
            args: Prisma.StripeConfigCountArgs<ExtArgs>
            result: $Utils.Optional<StripeConfigCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    organization?: OrganizationOmit
    user?: UserOmit
    platformAdmin?: PlatformAdminOmit
    adminAuditLog?: AdminAuditLogOmit
    systemConfig?: SystemConfigOmit
    adminSession?: AdminSessionOmit
    subscription?: SubscriptionOmit
    billingEvent?: BillingEventOmit
    revenueMetric?: RevenueMetricOmit
    stripeConfig?: StripeConfigOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type OrganizationCountOutputType
   */

  export type OrganizationCountOutputType = {
    users: number
    subscriptions: number
    billingEvents: number
  }

  export type OrganizationCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    users?: boolean | OrganizationCountOutputTypeCountUsersArgs
    subscriptions?: boolean | OrganizationCountOutputTypeCountSubscriptionsArgs
    billingEvents?: boolean | OrganizationCountOutputTypeCountBillingEventsArgs
  }

  // Custom InputTypes
  /**
   * OrganizationCountOutputType without action
   */
  export type OrganizationCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OrganizationCountOutputType
     */
    select?: OrganizationCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * OrganizationCountOutputType without action
   */
  export type OrganizationCountOutputTypeCountUsersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
  }

  /**
   * OrganizationCountOutputType without action
   */
  export type OrganizationCountOutputTypeCountSubscriptionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SubscriptionWhereInput
  }

  /**
   * OrganizationCountOutputType without action
   */
  export type OrganizationCountOutputTypeCountBillingEventsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: BillingEventWhereInput
  }


  /**
   * Count Type PlatformAdminCountOutputType
   */

  export type PlatformAdminCountOutputType = {
    auditLogs: number
    sessions: number
  }

  export type PlatformAdminCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    auditLogs?: boolean | PlatformAdminCountOutputTypeCountAuditLogsArgs
    sessions?: boolean | PlatformAdminCountOutputTypeCountSessionsArgs
  }

  // Custom InputTypes
  /**
   * PlatformAdminCountOutputType without action
   */
  export type PlatformAdminCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlatformAdminCountOutputType
     */
    select?: PlatformAdminCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * PlatformAdminCountOutputType without action
   */
  export type PlatformAdminCountOutputTypeCountAuditLogsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AdminAuditLogWhereInput
  }

  /**
   * PlatformAdminCountOutputType without action
   */
  export type PlatformAdminCountOutputTypeCountSessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AdminSessionWhereInput
  }


  /**
   * Count Type SubscriptionCountOutputType
   */

  export type SubscriptionCountOutputType = {
    billingEvents: number
  }

  export type SubscriptionCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    billingEvents?: boolean | SubscriptionCountOutputTypeCountBillingEventsArgs
  }

  // Custom InputTypes
  /**
   * SubscriptionCountOutputType without action
   */
  export type SubscriptionCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SubscriptionCountOutputType
     */
    select?: SubscriptionCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * SubscriptionCountOutputType without action
   */
  export type SubscriptionCountOutputTypeCountBillingEventsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: BillingEventWhereInput
  }


  /**
   * Models
   */

  /**
   * Model Organization
   */

  export type AggregateOrganization = {
    _count: OrganizationCountAggregateOutputType | null
    _min: OrganizationMinAggregateOutputType | null
    _max: OrganizationMaxAggregateOutputType | null
  }

  export type OrganizationMinAggregateOutputType = {
    id: string | null
    name: string | null
    slug: string | null
    isActive: boolean | null
    stripeCustomerId: string | null
    billingEmail: string | null
    trialEndsAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type OrganizationMaxAggregateOutputType = {
    id: string | null
    name: string | null
    slug: string | null
    isActive: boolean | null
    stripeCustomerId: string | null
    billingEmail: string | null
    trialEndsAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type OrganizationCountAggregateOutputType = {
    id: number
    name: number
    slug: number
    isActive: number
    settings: number
    stripeCustomerId: number
    billingEmail: number
    trialEndsAt: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type OrganizationMinAggregateInputType = {
    id?: true
    name?: true
    slug?: true
    isActive?: true
    stripeCustomerId?: true
    billingEmail?: true
    trialEndsAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type OrganizationMaxAggregateInputType = {
    id?: true
    name?: true
    slug?: true
    isActive?: true
    stripeCustomerId?: true
    billingEmail?: true
    trialEndsAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type OrganizationCountAggregateInputType = {
    id?: true
    name?: true
    slug?: true
    isActive?: true
    settings?: true
    stripeCustomerId?: true
    billingEmail?: true
    trialEndsAt?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type OrganizationAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Organization to aggregate.
     */
    where?: OrganizationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Organizations to fetch.
     */
    orderBy?: OrganizationOrderByWithRelationInput | OrganizationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: OrganizationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Organizations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Organizations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Organizations
    **/
    _count?: true | OrganizationCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: OrganizationMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: OrganizationMaxAggregateInputType
  }

  export type GetOrganizationAggregateType<T extends OrganizationAggregateArgs> = {
        [P in keyof T & keyof AggregateOrganization]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateOrganization[P]>
      : GetScalarType<T[P], AggregateOrganization[P]>
  }




  export type OrganizationGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OrganizationWhereInput
    orderBy?: OrganizationOrderByWithAggregationInput | OrganizationOrderByWithAggregationInput[]
    by: OrganizationScalarFieldEnum[] | OrganizationScalarFieldEnum
    having?: OrganizationScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: OrganizationCountAggregateInputType | true
    _min?: OrganizationMinAggregateInputType
    _max?: OrganizationMaxAggregateInputType
  }

  export type OrganizationGroupByOutputType = {
    id: string
    name: string
    slug: string
    isActive: boolean
    settings: JsonValue | null
    stripeCustomerId: string | null
    billingEmail: string | null
    trialEndsAt: Date | null
    createdAt: Date
    updatedAt: Date
    _count: OrganizationCountAggregateOutputType | null
    _min: OrganizationMinAggregateOutputType | null
    _max: OrganizationMaxAggregateOutputType | null
  }

  type GetOrganizationGroupByPayload<T extends OrganizationGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<OrganizationGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof OrganizationGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], OrganizationGroupByOutputType[P]>
            : GetScalarType<T[P], OrganizationGroupByOutputType[P]>
        }
      >
    >


  export type OrganizationSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    slug?: boolean
    isActive?: boolean
    settings?: boolean
    stripeCustomerId?: boolean
    billingEmail?: boolean
    trialEndsAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    users?: boolean | Organization$usersArgs<ExtArgs>
    subscriptions?: boolean | Organization$subscriptionsArgs<ExtArgs>
    billingEvents?: boolean | Organization$billingEventsArgs<ExtArgs>
    _count?: boolean | OrganizationCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["organization"]>

  export type OrganizationSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    slug?: boolean
    isActive?: boolean
    settings?: boolean
    stripeCustomerId?: boolean
    billingEmail?: boolean
    trialEndsAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["organization"]>

  export type OrganizationSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    slug?: boolean
    isActive?: boolean
    settings?: boolean
    stripeCustomerId?: boolean
    billingEmail?: boolean
    trialEndsAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["organization"]>

  export type OrganizationSelectScalar = {
    id?: boolean
    name?: boolean
    slug?: boolean
    isActive?: boolean
    settings?: boolean
    stripeCustomerId?: boolean
    billingEmail?: boolean
    trialEndsAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type OrganizationOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "slug" | "isActive" | "settings" | "stripeCustomerId" | "billingEmail" | "trialEndsAt" | "createdAt" | "updatedAt", ExtArgs["result"]["organization"]>
  export type OrganizationInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    users?: boolean | Organization$usersArgs<ExtArgs>
    subscriptions?: boolean | Organization$subscriptionsArgs<ExtArgs>
    billingEvents?: boolean | Organization$billingEventsArgs<ExtArgs>
    _count?: boolean | OrganizationCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type OrganizationIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type OrganizationIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $OrganizationPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Organization"
    objects: {
      users: Prisma.$UserPayload<ExtArgs>[]
      subscriptions: Prisma.$SubscriptionPayload<ExtArgs>[]
      billingEvents: Prisma.$BillingEventPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      slug: string
      isActive: boolean
      settings: Prisma.JsonValue | null
      stripeCustomerId: string | null
      billingEmail: string | null
      trialEndsAt: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["organization"]>
    composites: {}
  }

  type OrganizationGetPayload<S extends boolean | null | undefined | OrganizationDefaultArgs> = $Result.GetResult<Prisma.$OrganizationPayload, S>

  type OrganizationCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<OrganizationFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: OrganizationCountAggregateInputType | true
    }

  export interface OrganizationDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Organization'], meta: { name: 'Organization' } }
    /**
     * Find zero or one Organization that matches the filter.
     * @param {OrganizationFindUniqueArgs} args - Arguments to find a Organization
     * @example
     * // Get one Organization
     * const organization = await prisma.organization.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends OrganizationFindUniqueArgs>(args: SelectSubset<T, OrganizationFindUniqueArgs<ExtArgs>>): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Organization that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {OrganizationFindUniqueOrThrowArgs} args - Arguments to find a Organization
     * @example
     * // Get one Organization
     * const organization = await prisma.organization.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends OrganizationFindUniqueOrThrowArgs>(args: SelectSubset<T, OrganizationFindUniqueOrThrowArgs<ExtArgs>>): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Organization that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationFindFirstArgs} args - Arguments to find a Organization
     * @example
     * // Get one Organization
     * const organization = await prisma.organization.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends OrganizationFindFirstArgs>(args?: SelectSubset<T, OrganizationFindFirstArgs<ExtArgs>>): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Organization that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationFindFirstOrThrowArgs} args - Arguments to find a Organization
     * @example
     * // Get one Organization
     * const organization = await prisma.organization.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends OrganizationFindFirstOrThrowArgs>(args?: SelectSubset<T, OrganizationFindFirstOrThrowArgs<ExtArgs>>): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Organizations that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Organizations
     * const organizations = await prisma.organization.findMany()
     * 
     * // Get first 10 Organizations
     * const organizations = await prisma.organization.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const organizationWithIdOnly = await prisma.organization.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends OrganizationFindManyArgs>(args?: SelectSubset<T, OrganizationFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Organization.
     * @param {OrganizationCreateArgs} args - Arguments to create a Organization.
     * @example
     * // Create one Organization
     * const Organization = await prisma.organization.create({
     *   data: {
     *     // ... data to create a Organization
     *   }
     * })
     * 
     */
    create<T extends OrganizationCreateArgs>(args: SelectSubset<T, OrganizationCreateArgs<ExtArgs>>): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Organizations.
     * @param {OrganizationCreateManyArgs} args - Arguments to create many Organizations.
     * @example
     * // Create many Organizations
     * const organization = await prisma.organization.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends OrganizationCreateManyArgs>(args?: SelectSubset<T, OrganizationCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Organizations and returns the data saved in the database.
     * @param {OrganizationCreateManyAndReturnArgs} args - Arguments to create many Organizations.
     * @example
     * // Create many Organizations
     * const organization = await prisma.organization.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Organizations and only return the `id`
     * const organizationWithIdOnly = await prisma.organization.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends OrganizationCreateManyAndReturnArgs>(args?: SelectSubset<T, OrganizationCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Organization.
     * @param {OrganizationDeleteArgs} args - Arguments to delete one Organization.
     * @example
     * // Delete one Organization
     * const Organization = await prisma.organization.delete({
     *   where: {
     *     // ... filter to delete one Organization
     *   }
     * })
     * 
     */
    delete<T extends OrganizationDeleteArgs>(args: SelectSubset<T, OrganizationDeleteArgs<ExtArgs>>): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Organization.
     * @param {OrganizationUpdateArgs} args - Arguments to update one Organization.
     * @example
     * // Update one Organization
     * const organization = await prisma.organization.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends OrganizationUpdateArgs>(args: SelectSubset<T, OrganizationUpdateArgs<ExtArgs>>): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Organizations.
     * @param {OrganizationDeleteManyArgs} args - Arguments to filter Organizations to delete.
     * @example
     * // Delete a few Organizations
     * const { count } = await prisma.organization.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends OrganizationDeleteManyArgs>(args?: SelectSubset<T, OrganizationDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Organizations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Organizations
     * const organization = await prisma.organization.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends OrganizationUpdateManyArgs>(args: SelectSubset<T, OrganizationUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Organizations and returns the data updated in the database.
     * @param {OrganizationUpdateManyAndReturnArgs} args - Arguments to update many Organizations.
     * @example
     * // Update many Organizations
     * const organization = await prisma.organization.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Organizations and only return the `id`
     * const organizationWithIdOnly = await prisma.organization.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends OrganizationUpdateManyAndReturnArgs>(args: SelectSubset<T, OrganizationUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Organization.
     * @param {OrganizationUpsertArgs} args - Arguments to update or create a Organization.
     * @example
     * // Update or create a Organization
     * const organization = await prisma.organization.upsert({
     *   create: {
     *     // ... data to create a Organization
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Organization we want to update
     *   }
     * })
     */
    upsert<T extends OrganizationUpsertArgs>(args: SelectSubset<T, OrganizationUpsertArgs<ExtArgs>>): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Organizations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationCountArgs} args - Arguments to filter Organizations to count.
     * @example
     * // Count the number of Organizations
     * const count = await prisma.organization.count({
     *   where: {
     *     // ... the filter for the Organizations we want to count
     *   }
     * })
    **/
    count<T extends OrganizationCountArgs>(
      args?: Subset<T, OrganizationCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], OrganizationCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Organization.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends OrganizationAggregateArgs>(args: Subset<T, OrganizationAggregateArgs>): Prisma.PrismaPromise<GetOrganizationAggregateType<T>>

    /**
     * Group by Organization.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends OrganizationGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: OrganizationGroupByArgs['orderBy'] }
        : { orderBy?: OrganizationGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, OrganizationGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetOrganizationGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Organization model
   */
  readonly fields: OrganizationFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Organization.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__OrganizationClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    users<T extends Organization$usersArgs<ExtArgs> = {}>(args?: Subset<T, Organization$usersArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    subscriptions<T extends Organization$subscriptionsArgs<ExtArgs> = {}>(args?: Subset<T, Organization$subscriptionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    billingEvents<T extends Organization$billingEventsArgs<ExtArgs> = {}>(args?: Subset<T, Organization$billingEventsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BillingEventPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Organization model
   */
  interface OrganizationFieldRefs {
    readonly id: FieldRef<"Organization", 'String'>
    readonly name: FieldRef<"Organization", 'String'>
    readonly slug: FieldRef<"Organization", 'String'>
    readonly isActive: FieldRef<"Organization", 'Boolean'>
    readonly settings: FieldRef<"Organization", 'Json'>
    readonly stripeCustomerId: FieldRef<"Organization", 'String'>
    readonly billingEmail: FieldRef<"Organization", 'String'>
    readonly trialEndsAt: FieldRef<"Organization", 'DateTime'>
    readonly createdAt: FieldRef<"Organization", 'DateTime'>
    readonly updatedAt: FieldRef<"Organization", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Organization findUnique
   */
  export type OrganizationFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Organization
     */
    omit?: OrganizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * Filter, which Organization to fetch.
     */
    where: OrganizationWhereUniqueInput
  }

  /**
   * Organization findUniqueOrThrow
   */
  export type OrganizationFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Organization
     */
    omit?: OrganizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * Filter, which Organization to fetch.
     */
    where: OrganizationWhereUniqueInput
  }

  /**
   * Organization findFirst
   */
  export type OrganizationFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Organization
     */
    omit?: OrganizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * Filter, which Organization to fetch.
     */
    where?: OrganizationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Organizations to fetch.
     */
    orderBy?: OrganizationOrderByWithRelationInput | OrganizationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Organizations.
     */
    cursor?: OrganizationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Organizations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Organizations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Organizations.
     */
    distinct?: OrganizationScalarFieldEnum | OrganizationScalarFieldEnum[]
  }

  /**
   * Organization findFirstOrThrow
   */
  export type OrganizationFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Organization
     */
    omit?: OrganizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * Filter, which Organization to fetch.
     */
    where?: OrganizationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Organizations to fetch.
     */
    orderBy?: OrganizationOrderByWithRelationInput | OrganizationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Organizations.
     */
    cursor?: OrganizationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Organizations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Organizations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Organizations.
     */
    distinct?: OrganizationScalarFieldEnum | OrganizationScalarFieldEnum[]
  }

  /**
   * Organization findMany
   */
  export type OrganizationFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Organization
     */
    omit?: OrganizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * Filter, which Organizations to fetch.
     */
    where?: OrganizationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Organizations to fetch.
     */
    orderBy?: OrganizationOrderByWithRelationInput | OrganizationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Organizations.
     */
    cursor?: OrganizationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Organizations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Organizations.
     */
    skip?: number
    distinct?: OrganizationScalarFieldEnum | OrganizationScalarFieldEnum[]
  }

  /**
   * Organization create
   */
  export type OrganizationCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Organization
     */
    omit?: OrganizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * The data needed to create a Organization.
     */
    data: XOR<OrganizationCreateInput, OrganizationUncheckedCreateInput>
  }

  /**
   * Organization createMany
   */
  export type OrganizationCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Organizations.
     */
    data: OrganizationCreateManyInput | OrganizationCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Organization createManyAndReturn
   */
  export type OrganizationCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Organization
     */
    omit?: OrganizationOmit<ExtArgs> | null
    /**
     * The data used to create many Organizations.
     */
    data: OrganizationCreateManyInput | OrganizationCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Organization update
   */
  export type OrganizationUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Organization
     */
    omit?: OrganizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * The data needed to update a Organization.
     */
    data: XOR<OrganizationUpdateInput, OrganizationUncheckedUpdateInput>
    /**
     * Choose, which Organization to update.
     */
    where: OrganizationWhereUniqueInput
  }

  /**
   * Organization updateMany
   */
  export type OrganizationUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Organizations.
     */
    data: XOR<OrganizationUpdateManyMutationInput, OrganizationUncheckedUpdateManyInput>
    /**
     * Filter which Organizations to update
     */
    where?: OrganizationWhereInput
    /**
     * Limit how many Organizations to update.
     */
    limit?: number
  }

  /**
   * Organization updateManyAndReturn
   */
  export type OrganizationUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Organization
     */
    omit?: OrganizationOmit<ExtArgs> | null
    /**
     * The data used to update Organizations.
     */
    data: XOR<OrganizationUpdateManyMutationInput, OrganizationUncheckedUpdateManyInput>
    /**
     * Filter which Organizations to update
     */
    where?: OrganizationWhereInput
    /**
     * Limit how many Organizations to update.
     */
    limit?: number
  }

  /**
   * Organization upsert
   */
  export type OrganizationUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Organization
     */
    omit?: OrganizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * The filter to search for the Organization to update in case it exists.
     */
    where: OrganizationWhereUniqueInput
    /**
     * In case the Organization found by the `where` argument doesn't exist, create a new Organization with this data.
     */
    create: XOR<OrganizationCreateInput, OrganizationUncheckedCreateInput>
    /**
     * In case the Organization was found with the provided `where` argument, update it with this data.
     */
    update: XOR<OrganizationUpdateInput, OrganizationUncheckedUpdateInput>
  }

  /**
   * Organization delete
   */
  export type OrganizationDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Organization
     */
    omit?: OrganizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * Filter which Organization to delete.
     */
    where: OrganizationWhereUniqueInput
  }

  /**
   * Organization deleteMany
   */
  export type OrganizationDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Organizations to delete
     */
    where?: OrganizationWhereInput
    /**
     * Limit how many Organizations to delete.
     */
    limit?: number
  }

  /**
   * Organization.users
   */
  export type Organization$usersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    cursor?: UserWhereUniqueInput
    take?: number
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * Organization.subscriptions
   */
  export type Organization$subscriptionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    where?: SubscriptionWhereInput
    orderBy?: SubscriptionOrderByWithRelationInput | SubscriptionOrderByWithRelationInput[]
    cursor?: SubscriptionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SubscriptionScalarFieldEnum | SubscriptionScalarFieldEnum[]
  }

  /**
   * Organization.billingEvents
   */
  export type Organization$billingEventsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BillingEvent
     */
    select?: BillingEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BillingEvent
     */
    omit?: BillingEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BillingEventInclude<ExtArgs> | null
    where?: BillingEventWhereInput
    orderBy?: BillingEventOrderByWithRelationInput | BillingEventOrderByWithRelationInput[]
    cursor?: BillingEventWhereUniqueInput
    take?: number
    skip?: number
    distinct?: BillingEventScalarFieldEnum | BillingEventScalarFieldEnum[]
  }

  /**
   * Organization without action
   */
  export type OrganizationDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Organization
     */
    omit?: OrganizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrganizationInclude<ExtArgs> | null
  }


  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _avg: UserAvgAggregateOutputType | null
    _sum: UserSumAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserAvgAggregateOutputType = {
    loginAttempts: number | null
  }

  export type UserSumAggregateOutputType = {
    loginAttempts: number | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    email: string | null
    password: string | null
    firstName: string | null
    lastName: string | null
    phone: string | null
    phoneCarrier: string | null
    organizationId: string | null
    role: string | null
    accountSetupToken: string | null
    accountSetupTokenExpires: Date | null
    twoFactorSecret: string | null
    twoFactorEnabledAt: Date | null
    isActive: boolean | null
    isEmailVerified: boolean | null
    lastLoginAt: Date | null
    loginAttempts: number | null
    lockedUntil: Date | null
    passwordResetToken: string | null
    passwordResetTokenExpires: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    email: string | null
    password: string | null
    firstName: string | null
    lastName: string | null
    phone: string | null
    phoneCarrier: string | null
    organizationId: string | null
    role: string | null
    accountSetupToken: string | null
    accountSetupTokenExpires: Date | null
    twoFactorSecret: string | null
    twoFactorEnabledAt: Date | null
    isActive: boolean | null
    isEmailVerified: boolean | null
    lastLoginAt: Date | null
    loginAttempts: number | null
    lockedUntil: Date | null
    passwordResetToken: string | null
    passwordResetTokenExpires: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    email: number
    password: number
    firstName: number
    lastName: number
    phone: number
    phoneCarrier: number
    organizationId: number
    role: number
    accountSetupToken: number
    accountSetupTokenExpires: number
    twoFactorSecret: number
    twoFactorBackupCodes: number
    twoFactorEnabledAt: number
    twoFactorOTP: number
    trustedDevices: number
    isActive: number
    isEmailVerified: number
    lastLoginAt: number
    loginAttempts: number
    lockedUntil: number
    passwordResetToken: number
    passwordResetTokenExpires: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type UserAvgAggregateInputType = {
    loginAttempts?: true
  }

  export type UserSumAggregateInputType = {
    loginAttempts?: true
  }

  export type UserMinAggregateInputType = {
    id?: true
    email?: true
    password?: true
    firstName?: true
    lastName?: true
    phone?: true
    phoneCarrier?: true
    organizationId?: true
    role?: true
    accountSetupToken?: true
    accountSetupTokenExpires?: true
    twoFactorSecret?: true
    twoFactorEnabledAt?: true
    isActive?: true
    isEmailVerified?: true
    lastLoginAt?: true
    loginAttempts?: true
    lockedUntil?: true
    passwordResetToken?: true
    passwordResetTokenExpires?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    email?: true
    password?: true
    firstName?: true
    lastName?: true
    phone?: true
    phoneCarrier?: true
    organizationId?: true
    role?: true
    accountSetupToken?: true
    accountSetupTokenExpires?: true
    twoFactorSecret?: true
    twoFactorEnabledAt?: true
    isActive?: true
    isEmailVerified?: true
    lastLoginAt?: true
    loginAttempts?: true
    lockedUntil?: true
    passwordResetToken?: true
    passwordResetTokenExpires?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    email?: true
    password?: true
    firstName?: true
    lastName?: true
    phone?: true
    phoneCarrier?: true
    organizationId?: true
    role?: true
    accountSetupToken?: true
    accountSetupTokenExpires?: true
    twoFactorSecret?: true
    twoFactorBackupCodes?: true
    twoFactorEnabledAt?: true
    twoFactorOTP?: true
    trustedDevices?: true
    isActive?: true
    isEmailVerified?: true
    lastLoginAt?: true
    loginAttempts?: true
    lockedUntil?: true
    passwordResetToken?: true
    passwordResetTokenExpires?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: UserAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: UserSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _avg?: UserAvgAggregateInputType
    _sum?: UserSumAggregateInputType
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    email: string
    password: string | null
    firstName: string
    lastName: string
    phone: string | null
    phoneCarrier: string | null
    organizationId: string
    role: string
    accountSetupToken: string | null
    accountSetupTokenExpires: Date | null
    twoFactorSecret: string | null
    twoFactorBackupCodes: JsonValue | null
    twoFactorEnabledAt: Date | null
    twoFactorOTP: JsonValue | null
    trustedDevices: JsonValue | null
    isActive: boolean
    isEmailVerified: boolean
    lastLoginAt: Date | null
    loginAttempts: number
    lockedUntil: Date | null
    passwordResetToken: string | null
    passwordResetTokenExpires: Date | null
    createdAt: Date
    updatedAt: Date
    _count: UserCountAggregateOutputType | null
    _avg: UserAvgAggregateOutputType | null
    _sum: UserSumAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    password?: boolean
    firstName?: boolean
    lastName?: boolean
    phone?: boolean
    phoneCarrier?: boolean
    organizationId?: boolean
    role?: boolean
    accountSetupToken?: boolean
    accountSetupTokenExpires?: boolean
    twoFactorSecret?: boolean
    twoFactorBackupCodes?: boolean
    twoFactorEnabledAt?: boolean
    twoFactorOTP?: boolean
    trustedDevices?: boolean
    isActive?: boolean
    isEmailVerified?: boolean
    lastLoginAt?: boolean
    loginAttempts?: boolean
    lockedUntil?: boolean
    passwordResetToken?: boolean
    passwordResetTokenExpires?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    organization?: boolean | OrganizationDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    password?: boolean
    firstName?: boolean
    lastName?: boolean
    phone?: boolean
    phoneCarrier?: boolean
    organizationId?: boolean
    role?: boolean
    accountSetupToken?: boolean
    accountSetupTokenExpires?: boolean
    twoFactorSecret?: boolean
    twoFactorBackupCodes?: boolean
    twoFactorEnabledAt?: boolean
    twoFactorOTP?: boolean
    trustedDevices?: boolean
    isActive?: boolean
    isEmailVerified?: boolean
    lastLoginAt?: boolean
    loginAttempts?: boolean
    lockedUntil?: boolean
    passwordResetToken?: boolean
    passwordResetTokenExpires?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    organization?: boolean | OrganizationDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    password?: boolean
    firstName?: boolean
    lastName?: boolean
    phone?: boolean
    phoneCarrier?: boolean
    organizationId?: boolean
    role?: boolean
    accountSetupToken?: boolean
    accountSetupTokenExpires?: boolean
    twoFactorSecret?: boolean
    twoFactorBackupCodes?: boolean
    twoFactorEnabledAt?: boolean
    twoFactorOTP?: boolean
    trustedDevices?: boolean
    isActive?: boolean
    isEmailVerified?: boolean
    lastLoginAt?: boolean
    loginAttempts?: boolean
    lockedUntil?: boolean
    passwordResetToken?: boolean
    passwordResetTokenExpires?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    organization?: boolean | OrganizationDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    email?: boolean
    password?: boolean
    firstName?: boolean
    lastName?: boolean
    phone?: boolean
    phoneCarrier?: boolean
    organizationId?: boolean
    role?: boolean
    accountSetupToken?: boolean
    accountSetupTokenExpires?: boolean
    twoFactorSecret?: boolean
    twoFactorBackupCodes?: boolean
    twoFactorEnabledAt?: boolean
    twoFactorOTP?: boolean
    trustedDevices?: boolean
    isActive?: boolean
    isEmailVerified?: boolean
    lastLoginAt?: boolean
    loginAttempts?: boolean
    lockedUntil?: boolean
    passwordResetToken?: boolean
    passwordResetTokenExpires?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type UserOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "email" | "password" | "firstName" | "lastName" | "phone" | "phoneCarrier" | "organizationId" | "role" | "accountSetupToken" | "accountSetupTokenExpires" | "twoFactorSecret" | "twoFactorBackupCodes" | "twoFactorEnabledAt" | "twoFactorOTP" | "trustedDevices" | "isActive" | "isEmailVerified" | "lastLoginAt" | "loginAttempts" | "lockedUntil" | "passwordResetToken" | "passwordResetTokenExpires" | "createdAt" | "updatedAt", ExtArgs["result"]["user"]>
  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    organization?: boolean | OrganizationDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    organization?: boolean | OrganizationDefaultArgs<ExtArgs>
  }
  export type UserIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    organization?: boolean | OrganizationDefaultArgs<ExtArgs>
  }

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      organization: Prisma.$OrganizationPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      email: string
      password: string | null
      firstName: string
      lastName: string
      phone: string | null
      phoneCarrier: string | null
      organizationId: string
      role: string
      accountSetupToken: string | null
      accountSetupTokenExpires: Date | null
      twoFactorSecret: string | null
      twoFactorBackupCodes: Prisma.JsonValue | null
      twoFactorEnabledAt: Date | null
      twoFactorOTP: Prisma.JsonValue | null
      trustedDevices: Prisma.JsonValue | null
      isActive: boolean
      isEmailVerified: boolean
      lastLoginAt: Date | null
      loginAttempts: number
      lockedUntil: Date | null
      passwordResetToken: string | null
      passwordResetTokenExpires: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users and returns the data updated in the database.
     * @param {UserUpdateManyAndReturnArgs} args - Arguments to update many Users.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Users and only return the `id`
     * const userWithIdOnly = await prisma.user.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserUpdateManyAndReturnArgs>(args: SelectSubset<T, UserUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    organization<T extends OrganizationDefaultArgs<ExtArgs> = {}>(args?: Subset<T, OrganizationDefaultArgs<ExtArgs>>): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly password: FieldRef<"User", 'String'>
    readonly firstName: FieldRef<"User", 'String'>
    readonly lastName: FieldRef<"User", 'String'>
    readonly phone: FieldRef<"User", 'String'>
    readonly phoneCarrier: FieldRef<"User", 'String'>
    readonly organizationId: FieldRef<"User", 'String'>
    readonly role: FieldRef<"User", 'String'>
    readonly accountSetupToken: FieldRef<"User", 'String'>
    readonly accountSetupTokenExpires: FieldRef<"User", 'DateTime'>
    readonly twoFactorSecret: FieldRef<"User", 'String'>
    readonly twoFactorBackupCodes: FieldRef<"User", 'Json'>
    readonly twoFactorEnabledAt: FieldRef<"User", 'DateTime'>
    readonly twoFactorOTP: FieldRef<"User", 'Json'>
    readonly trustedDevices: FieldRef<"User", 'Json'>
    readonly isActive: FieldRef<"User", 'Boolean'>
    readonly isEmailVerified: FieldRef<"User", 'Boolean'>
    readonly lastLoginAt: FieldRef<"User", 'DateTime'>
    readonly loginAttempts: FieldRef<"User", 'Int'>
    readonly lockedUntil: FieldRef<"User", 'DateTime'>
    readonly passwordResetToken: FieldRef<"User", 'String'>
    readonly passwordResetTokenExpires: FieldRef<"User", 'DateTime'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
    readonly updatedAt: FieldRef<"User", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User updateManyAndReturn
   */
  export type UserUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to delete.
     */
    limit?: number
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model PlatformAdmin
   */

  export type AggregatePlatformAdmin = {
    _count: PlatformAdminCountAggregateOutputType | null
    _avg: PlatformAdminAvgAggregateOutputType | null
    _sum: PlatformAdminSumAggregateOutputType | null
    _min: PlatformAdminMinAggregateOutputType | null
    _max: PlatformAdminMaxAggregateOutputType | null
  }

  export type PlatformAdminAvgAggregateOutputType = {
    loginAttempts: number | null
  }

  export type PlatformAdminSumAggregateOutputType = {
    loginAttempts: number | null
  }

  export type PlatformAdminMinAggregateOutputType = {
    id: string | null
    email: string | null
    passwordHash: string | null
    firstName: string | null
    lastName: string | null
    role: $Enums.AdminRole | null
    isActive: boolean | null
    twoFactorSecret: string | null
    twoFactorEnabled: boolean | null
    loginAttempts: number | null
    lockedUntil: Date | null
    lastLoginAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type PlatformAdminMaxAggregateOutputType = {
    id: string | null
    email: string | null
    passwordHash: string | null
    firstName: string | null
    lastName: string | null
    role: $Enums.AdminRole | null
    isActive: boolean | null
    twoFactorSecret: string | null
    twoFactorEnabled: boolean | null
    loginAttempts: number | null
    lockedUntil: Date | null
    lastLoginAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type PlatformAdminCountAggregateOutputType = {
    id: number
    email: number
    passwordHash: number
    firstName: number
    lastName: number
    role: number
    isActive: number
    twoFactorSecret: number
    twoFactorEnabled: number
    twoFactorBackupCodes: number
    twoFactorOTP: number
    trustedDevices: number
    loginAttempts: number
    lockedUntil: number
    lastLoginAt: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type PlatformAdminAvgAggregateInputType = {
    loginAttempts?: true
  }

  export type PlatformAdminSumAggregateInputType = {
    loginAttempts?: true
  }

  export type PlatformAdminMinAggregateInputType = {
    id?: true
    email?: true
    passwordHash?: true
    firstName?: true
    lastName?: true
    role?: true
    isActive?: true
    twoFactorSecret?: true
    twoFactorEnabled?: true
    loginAttempts?: true
    lockedUntil?: true
    lastLoginAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type PlatformAdminMaxAggregateInputType = {
    id?: true
    email?: true
    passwordHash?: true
    firstName?: true
    lastName?: true
    role?: true
    isActive?: true
    twoFactorSecret?: true
    twoFactorEnabled?: true
    loginAttempts?: true
    lockedUntil?: true
    lastLoginAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type PlatformAdminCountAggregateInputType = {
    id?: true
    email?: true
    passwordHash?: true
    firstName?: true
    lastName?: true
    role?: true
    isActive?: true
    twoFactorSecret?: true
    twoFactorEnabled?: true
    twoFactorBackupCodes?: true
    twoFactorOTP?: true
    trustedDevices?: true
    loginAttempts?: true
    lockedUntil?: true
    lastLoginAt?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type PlatformAdminAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PlatformAdmin to aggregate.
     */
    where?: PlatformAdminWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PlatformAdmins to fetch.
     */
    orderBy?: PlatformAdminOrderByWithRelationInput | PlatformAdminOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PlatformAdminWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PlatformAdmins from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PlatformAdmins.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned PlatformAdmins
    **/
    _count?: true | PlatformAdminCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: PlatformAdminAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: PlatformAdminSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PlatformAdminMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PlatformAdminMaxAggregateInputType
  }

  export type GetPlatformAdminAggregateType<T extends PlatformAdminAggregateArgs> = {
        [P in keyof T & keyof AggregatePlatformAdmin]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePlatformAdmin[P]>
      : GetScalarType<T[P], AggregatePlatformAdmin[P]>
  }




  export type PlatformAdminGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PlatformAdminWhereInput
    orderBy?: PlatformAdminOrderByWithAggregationInput | PlatformAdminOrderByWithAggregationInput[]
    by: PlatformAdminScalarFieldEnum[] | PlatformAdminScalarFieldEnum
    having?: PlatformAdminScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PlatformAdminCountAggregateInputType | true
    _avg?: PlatformAdminAvgAggregateInputType
    _sum?: PlatformAdminSumAggregateInputType
    _min?: PlatformAdminMinAggregateInputType
    _max?: PlatformAdminMaxAggregateInputType
  }

  export type PlatformAdminGroupByOutputType = {
    id: string
    email: string
    passwordHash: string
    firstName: string
    lastName: string
    role: $Enums.AdminRole
    isActive: boolean
    twoFactorSecret: string | null
    twoFactorEnabled: boolean
    twoFactorBackupCodes: JsonValue | null
    twoFactorOTP: JsonValue | null
    trustedDevices: JsonValue | null
    loginAttempts: number
    lockedUntil: Date | null
    lastLoginAt: Date | null
    createdAt: Date
    updatedAt: Date
    _count: PlatformAdminCountAggregateOutputType | null
    _avg: PlatformAdminAvgAggregateOutputType | null
    _sum: PlatformAdminSumAggregateOutputType | null
    _min: PlatformAdminMinAggregateOutputType | null
    _max: PlatformAdminMaxAggregateOutputType | null
  }

  type GetPlatformAdminGroupByPayload<T extends PlatformAdminGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PlatformAdminGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PlatformAdminGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PlatformAdminGroupByOutputType[P]>
            : GetScalarType<T[P], PlatformAdminGroupByOutputType[P]>
        }
      >
    >


  export type PlatformAdminSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    passwordHash?: boolean
    firstName?: boolean
    lastName?: boolean
    role?: boolean
    isActive?: boolean
    twoFactorSecret?: boolean
    twoFactorEnabled?: boolean
    twoFactorBackupCodes?: boolean
    twoFactorOTP?: boolean
    trustedDevices?: boolean
    loginAttempts?: boolean
    lockedUntil?: boolean
    lastLoginAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    auditLogs?: boolean | PlatformAdmin$auditLogsArgs<ExtArgs>
    sessions?: boolean | PlatformAdmin$sessionsArgs<ExtArgs>
    _count?: boolean | PlatformAdminCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["platformAdmin"]>

  export type PlatformAdminSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    passwordHash?: boolean
    firstName?: boolean
    lastName?: boolean
    role?: boolean
    isActive?: boolean
    twoFactorSecret?: boolean
    twoFactorEnabled?: boolean
    twoFactorBackupCodes?: boolean
    twoFactorOTP?: boolean
    trustedDevices?: boolean
    loginAttempts?: boolean
    lockedUntil?: boolean
    lastLoginAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["platformAdmin"]>

  export type PlatformAdminSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    passwordHash?: boolean
    firstName?: boolean
    lastName?: boolean
    role?: boolean
    isActive?: boolean
    twoFactorSecret?: boolean
    twoFactorEnabled?: boolean
    twoFactorBackupCodes?: boolean
    twoFactorOTP?: boolean
    trustedDevices?: boolean
    loginAttempts?: boolean
    lockedUntil?: boolean
    lastLoginAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["platformAdmin"]>

  export type PlatformAdminSelectScalar = {
    id?: boolean
    email?: boolean
    passwordHash?: boolean
    firstName?: boolean
    lastName?: boolean
    role?: boolean
    isActive?: boolean
    twoFactorSecret?: boolean
    twoFactorEnabled?: boolean
    twoFactorBackupCodes?: boolean
    twoFactorOTP?: boolean
    trustedDevices?: boolean
    loginAttempts?: boolean
    lockedUntil?: boolean
    lastLoginAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type PlatformAdminOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "email" | "passwordHash" | "firstName" | "lastName" | "role" | "isActive" | "twoFactorSecret" | "twoFactorEnabled" | "twoFactorBackupCodes" | "twoFactorOTP" | "trustedDevices" | "loginAttempts" | "lockedUntil" | "lastLoginAt" | "createdAt" | "updatedAt", ExtArgs["result"]["platformAdmin"]>
  export type PlatformAdminInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    auditLogs?: boolean | PlatformAdmin$auditLogsArgs<ExtArgs>
    sessions?: boolean | PlatformAdmin$sessionsArgs<ExtArgs>
    _count?: boolean | PlatformAdminCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type PlatformAdminIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type PlatformAdminIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $PlatformAdminPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "PlatformAdmin"
    objects: {
      auditLogs: Prisma.$AdminAuditLogPayload<ExtArgs>[]
      sessions: Prisma.$AdminSessionPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      email: string
      passwordHash: string
      firstName: string
      lastName: string
      role: $Enums.AdminRole
      isActive: boolean
      twoFactorSecret: string | null
      twoFactorEnabled: boolean
      twoFactorBackupCodes: Prisma.JsonValue | null
      twoFactorOTP: Prisma.JsonValue | null
      trustedDevices: Prisma.JsonValue | null
      loginAttempts: number
      lockedUntil: Date | null
      lastLoginAt: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["platformAdmin"]>
    composites: {}
  }

  type PlatformAdminGetPayload<S extends boolean | null | undefined | PlatformAdminDefaultArgs> = $Result.GetResult<Prisma.$PlatformAdminPayload, S>

  type PlatformAdminCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<PlatformAdminFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: PlatformAdminCountAggregateInputType | true
    }

  export interface PlatformAdminDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['PlatformAdmin'], meta: { name: 'PlatformAdmin' } }
    /**
     * Find zero or one PlatformAdmin that matches the filter.
     * @param {PlatformAdminFindUniqueArgs} args - Arguments to find a PlatformAdmin
     * @example
     * // Get one PlatformAdmin
     * const platformAdmin = await prisma.platformAdmin.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends PlatformAdminFindUniqueArgs>(args: SelectSubset<T, PlatformAdminFindUniqueArgs<ExtArgs>>): Prisma__PlatformAdminClient<$Result.GetResult<Prisma.$PlatformAdminPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one PlatformAdmin that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {PlatformAdminFindUniqueOrThrowArgs} args - Arguments to find a PlatformAdmin
     * @example
     * // Get one PlatformAdmin
     * const platformAdmin = await prisma.platformAdmin.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends PlatformAdminFindUniqueOrThrowArgs>(args: SelectSubset<T, PlatformAdminFindUniqueOrThrowArgs<ExtArgs>>): Prisma__PlatformAdminClient<$Result.GetResult<Prisma.$PlatformAdminPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first PlatformAdmin that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlatformAdminFindFirstArgs} args - Arguments to find a PlatformAdmin
     * @example
     * // Get one PlatformAdmin
     * const platformAdmin = await prisma.platformAdmin.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends PlatformAdminFindFirstArgs>(args?: SelectSubset<T, PlatformAdminFindFirstArgs<ExtArgs>>): Prisma__PlatformAdminClient<$Result.GetResult<Prisma.$PlatformAdminPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first PlatformAdmin that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlatformAdminFindFirstOrThrowArgs} args - Arguments to find a PlatformAdmin
     * @example
     * // Get one PlatformAdmin
     * const platformAdmin = await prisma.platformAdmin.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends PlatformAdminFindFirstOrThrowArgs>(args?: SelectSubset<T, PlatformAdminFindFirstOrThrowArgs<ExtArgs>>): Prisma__PlatformAdminClient<$Result.GetResult<Prisma.$PlatformAdminPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more PlatformAdmins that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlatformAdminFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all PlatformAdmins
     * const platformAdmins = await prisma.platformAdmin.findMany()
     * 
     * // Get first 10 PlatformAdmins
     * const platformAdmins = await prisma.platformAdmin.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const platformAdminWithIdOnly = await prisma.platformAdmin.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends PlatformAdminFindManyArgs>(args?: SelectSubset<T, PlatformAdminFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PlatformAdminPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a PlatformAdmin.
     * @param {PlatformAdminCreateArgs} args - Arguments to create a PlatformAdmin.
     * @example
     * // Create one PlatformAdmin
     * const PlatformAdmin = await prisma.platformAdmin.create({
     *   data: {
     *     // ... data to create a PlatformAdmin
     *   }
     * })
     * 
     */
    create<T extends PlatformAdminCreateArgs>(args: SelectSubset<T, PlatformAdminCreateArgs<ExtArgs>>): Prisma__PlatformAdminClient<$Result.GetResult<Prisma.$PlatformAdminPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many PlatformAdmins.
     * @param {PlatformAdminCreateManyArgs} args - Arguments to create many PlatformAdmins.
     * @example
     * // Create many PlatformAdmins
     * const platformAdmin = await prisma.platformAdmin.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends PlatformAdminCreateManyArgs>(args?: SelectSubset<T, PlatformAdminCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many PlatformAdmins and returns the data saved in the database.
     * @param {PlatformAdminCreateManyAndReturnArgs} args - Arguments to create many PlatformAdmins.
     * @example
     * // Create many PlatformAdmins
     * const platformAdmin = await prisma.platformAdmin.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many PlatformAdmins and only return the `id`
     * const platformAdminWithIdOnly = await prisma.platformAdmin.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends PlatformAdminCreateManyAndReturnArgs>(args?: SelectSubset<T, PlatformAdminCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PlatformAdminPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a PlatformAdmin.
     * @param {PlatformAdminDeleteArgs} args - Arguments to delete one PlatformAdmin.
     * @example
     * // Delete one PlatformAdmin
     * const PlatformAdmin = await prisma.platformAdmin.delete({
     *   where: {
     *     // ... filter to delete one PlatformAdmin
     *   }
     * })
     * 
     */
    delete<T extends PlatformAdminDeleteArgs>(args: SelectSubset<T, PlatformAdminDeleteArgs<ExtArgs>>): Prisma__PlatformAdminClient<$Result.GetResult<Prisma.$PlatformAdminPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one PlatformAdmin.
     * @param {PlatformAdminUpdateArgs} args - Arguments to update one PlatformAdmin.
     * @example
     * // Update one PlatformAdmin
     * const platformAdmin = await prisma.platformAdmin.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends PlatformAdminUpdateArgs>(args: SelectSubset<T, PlatformAdminUpdateArgs<ExtArgs>>): Prisma__PlatformAdminClient<$Result.GetResult<Prisma.$PlatformAdminPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more PlatformAdmins.
     * @param {PlatformAdminDeleteManyArgs} args - Arguments to filter PlatformAdmins to delete.
     * @example
     * // Delete a few PlatformAdmins
     * const { count } = await prisma.platformAdmin.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends PlatformAdminDeleteManyArgs>(args?: SelectSubset<T, PlatformAdminDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more PlatformAdmins.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlatformAdminUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many PlatformAdmins
     * const platformAdmin = await prisma.platformAdmin.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends PlatformAdminUpdateManyArgs>(args: SelectSubset<T, PlatformAdminUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more PlatformAdmins and returns the data updated in the database.
     * @param {PlatformAdminUpdateManyAndReturnArgs} args - Arguments to update many PlatformAdmins.
     * @example
     * // Update many PlatformAdmins
     * const platformAdmin = await prisma.platformAdmin.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more PlatformAdmins and only return the `id`
     * const platformAdminWithIdOnly = await prisma.platformAdmin.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends PlatformAdminUpdateManyAndReturnArgs>(args: SelectSubset<T, PlatformAdminUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PlatformAdminPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one PlatformAdmin.
     * @param {PlatformAdminUpsertArgs} args - Arguments to update or create a PlatformAdmin.
     * @example
     * // Update or create a PlatformAdmin
     * const platformAdmin = await prisma.platformAdmin.upsert({
     *   create: {
     *     // ... data to create a PlatformAdmin
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the PlatformAdmin we want to update
     *   }
     * })
     */
    upsert<T extends PlatformAdminUpsertArgs>(args: SelectSubset<T, PlatformAdminUpsertArgs<ExtArgs>>): Prisma__PlatformAdminClient<$Result.GetResult<Prisma.$PlatformAdminPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of PlatformAdmins.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlatformAdminCountArgs} args - Arguments to filter PlatformAdmins to count.
     * @example
     * // Count the number of PlatformAdmins
     * const count = await prisma.platformAdmin.count({
     *   where: {
     *     // ... the filter for the PlatformAdmins we want to count
     *   }
     * })
    **/
    count<T extends PlatformAdminCountArgs>(
      args?: Subset<T, PlatformAdminCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PlatformAdminCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a PlatformAdmin.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlatformAdminAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PlatformAdminAggregateArgs>(args: Subset<T, PlatformAdminAggregateArgs>): Prisma.PrismaPromise<GetPlatformAdminAggregateType<T>>

    /**
     * Group by PlatformAdmin.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlatformAdminGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends PlatformAdminGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PlatformAdminGroupByArgs['orderBy'] }
        : { orderBy?: PlatformAdminGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, PlatformAdminGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPlatformAdminGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the PlatformAdmin model
   */
  readonly fields: PlatformAdminFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for PlatformAdmin.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PlatformAdminClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    auditLogs<T extends PlatformAdmin$auditLogsArgs<ExtArgs> = {}>(args?: Subset<T, PlatformAdmin$auditLogsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AdminAuditLogPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    sessions<T extends PlatformAdmin$sessionsArgs<ExtArgs> = {}>(args?: Subset<T, PlatformAdmin$sessionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AdminSessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the PlatformAdmin model
   */
  interface PlatformAdminFieldRefs {
    readonly id: FieldRef<"PlatformAdmin", 'String'>
    readonly email: FieldRef<"PlatformAdmin", 'String'>
    readonly passwordHash: FieldRef<"PlatformAdmin", 'String'>
    readonly firstName: FieldRef<"PlatformAdmin", 'String'>
    readonly lastName: FieldRef<"PlatformAdmin", 'String'>
    readonly role: FieldRef<"PlatformAdmin", 'AdminRole'>
    readonly isActive: FieldRef<"PlatformAdmin", 'Boolean'>
    readonly twoFactorSecret: FieldRef<"PlatformAdmin", 'String'>
    readonly twoFactorEnabled: FieldRef<"PlatformAdmin", 'Boolean'>
    readonly twoFactorBackupCodes: FieldRef<"PlatformAdmin", 'Json'>
    readonly twoFactorOTP: FieldRef<"PlatformAdmin", 'Json'>
    readonly trustedDevices: FieldRef<"PlatformAdmin", 'Json'>
    readonly loginAttempts: FieldRef<"PlatformAdmin", 'Int'>
    readonly lockedUntil: FieldRef<"PlatformAdmin", 'DateTime'>
    readonly lastLoginAt: FieldRef<"PlatformAdmin", 'DateTime'>
    readonly createdAt: FieldRef<"PlatformAdmin", 'DateTime'>
    readonly updatedAt: FieldRef<"PlatformAdmin", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * PlatformAdmin findUnique
   */
  export type PlatformAdminFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlatformAdmin
     */
    select?: PlatformAdminSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PlatformAdmin
     */
    omit?: PlatformAdminOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlatformAdminInclude<ExtArgs> | null
    /**
     * Filter, which PlatformAdmin to fetch.
     */
    where: PlatformAdminWhereUniqueInput
  }

  /**
   * PlatformAdmin findUniqueOrThrow
   */
  export type PlatformAdminFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlatformAdmin
     */
    select?: PlatformAdminSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PlatformAdmin
     */
    omit?: PlatformAdminOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlatformAdminInclude<ExtArgs> | null
    /**
     * Filter, which PlatformAdmin to fetch.
     */
    where: PlatformAdminWhereUniqueInput
  }

  /**
   * PlatformAdmin findFirst
   */
  export type PlatformAdminFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlatformAdmin
     */
    select?: PlatformAdminSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PlatformAdmin
     */
    omit?: PlatformAdminOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlatformAdminInclude<ExtArgs> | null
    /**
     * Filter, which PlatformAdmin to fetch.
     */
    where?: PlatformAdminWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PlatformAdmins to fetch.
     */
    orderBy?: PlatformAdminOrderByWithRelationInput | PlatformAdminOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PlatformAdmins.
     */
    cursor?: PlatformAdminWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PlatformAdmins from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PlatformAdmins.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PlatformAdmins.
     */
    distinct?: PlatformAdminScalarFieldEnum | PlatformAdminScalarFieldEnum[]
  }

  /**
   * PlatformAdmin findFirstOrThrow
   */
  export type PlatformAdminFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlatformAdmin
     */
    select?: PlatformAdminSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PlatformAdmin
     */
    omit?: PlatformAdminOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlatformAdminInclude<ExtArgs> | null
    /**
     * Filter, which PlatformAdmin to fetch.
     */
    where?: PlatformAdminWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PlatformAdmins to fetch.
     */
    orderBy?: PlatformAdminOrderByWithRelationInput | PlatformAdminOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PlatformAdmins.
     */
    cursor?: PlatformAdminWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PlatformAdmins from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PlatformAdmins.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PlatformAdmins.
     */
    distinct?: PlatformAdminScalarFieldEnum | PlatformAdminScalarFieldEnum[]
  }

  /**
   * PlatformAdmin findMany
   */
  export type PlatformAdminFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlatformAdmin
     */
    select?: PlatformAdminSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PlatformAdmin
     */
    omit?: PlatformAdminOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlatformAdminInclude<ExtArgs> | null
    /**
     * Filter, which PlatformAdmins to fetch.
     */
    where?: PlatformAdminWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PlatformAdmins to fetch.
     */
    orderBy?: PlatformAdminOrderByWithRelationInput | PlatformAdminOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing PlatformAdmins.
     */
    cursor?: PlatformAdminWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PlatformAdmins from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PlatformAdmins.
     */
    skip?: number
    distinct?: PlatformAdminScalarFieldEnum | PlatformAdminScalarFieldEnum[]
  }

  /**
   * PlatformAdmin create
   */
  export type PlatformAdminCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlatformAdmin
     */
    select?: PlatformAdminSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PlatformAdmin
     */
    omit?: PlatformAdminOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlatformAdminInclude<ExtArgs> | null
    /**
     * The data needed to create a PlatformAdmin.
     */
    data: XOR<PlatformAdminCreateInput, PlatformAdminUncheckedCreateInput>
  }

  /**
   * PlatformAdmin createMany
   */
  export type PlatformAdminCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many PlatformAdmins.
     */
    data: PlatformAdminCreateManyInput | PlatformAdminCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * PlatformAdmin createManyAndReturn
   */
  export type PlatformAdminCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlatformAdmin
     */
    select?: PlatformAdminSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the PlatformAdmin
     */
    omit?: PlatformAdminOmit<ExtArgs> | null
    /**
     * The data used to create many PlatformAdmins.
     */
    data: PlatformAdminCreateManyInput | PlatformAdminCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * PlatformAdmin update
   */
  export type PlatformAdminUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlatformAdmin
     */
    select?: PlatformAdminSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PlatformAdmin
     */
    omit?: PlatformAdminOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlatformAdminInclude<ExtArgs> | null
    /**
     * The data needed to update a PlatformAdmin.
     */
    data: XOR<PlatformAdminUpdateInput, PlatformAdminUncheckedUpdateInput>
    /**
     * Choose, which PlatformAdmin to update.
     */
    where: PlatformAdminWhereUniqueInput
  }

  /**
   * PlatformAdmin updateMany
   */
  export type PlatformAdminUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update PlatformAdmins.
     */
    data: XOR<PlatformAdminUpdateManyMutationInput, PlatformAdminUncheckedUpdateManyInput>
    /**
     * Filter which PlatformAdmins to update
     */
    where?: PlatformAdminWhereInput
    /**
     * Limit how many PlatformAdmins to update.
     */
    limit?: number
  }

  /**
   * PlatformAdmin updateManyAndReturn
   */
  export type PlatformAdminUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlatformAdmin
     */
    select?: PlatformAdminSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the PlatformAdmin
     */
    omit?: PlatformAdminOmit<ExtArgs> | null
    /**
     * The data used to update PlatformAdmins.
     */
    data: XOR<PlatformAdminUpdateManyMutationInput, PlatformAdminUncheckedUpdateManyInput>
    /**
     * Filter which PlatformAdmins to update
     */
    where?: PlatformAdminWhereInput
    /**
     * Limit how many PlatformAdmins to update.
     */
    limit?: number
  }

  /**
   * PlatformAdmin upsert
   */
  export type PlatformAdminUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlatformAdmin
     */
    select?: PlatformAdminSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PlatformAdmin
     */
    omit?: PlatformAdminOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlatformAdminInclude<ExtArgs> | null
    /**
     * The filter to search for the PlatformAdmin to update in case it exists.
     */
    where: PlatformAdminWhereUniqueInput
    /**
     * In case the PlatformAdmin found by the `where` argument doesn't exist, create a new PlatformAdmin with this data.
     */
    create: XOR<PlatformAdminCreateInput, PlatformAdminUncheckedCreateInput>
    /**
     * In case the PlatformAdmin was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PlatformAdminUpdateInput, PlatformAdminUncheckedUpdateInput>
  }

  /**
   * PlatformAdmin delete
   */
  export type PlatformAdminDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlatformAdmin
     */
    select?: PlatformAdminSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PlatformAdmin
     */
    omit?: PlatformAdminOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlatformAdminInclude<ExtArgs> | null
    /**
     * Filter which PlatformAdmin to delete.
     */
    where: PlatformAdminWhereUniqueInput
  }

  /**
   * PlatformAdmin deleteMany
   */
  export type PlatformAdminDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PlatformAdmins to delete
     */
    where?: PlatformAdminWhereInput
    /**
     * Limit how many PlatformAdmins to delete.
     */
    limit?: number
  }

  /**
   * PlatformAdmin.auditLogs
   */
  export type PlatformAdmin$auditLogsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminAuditLog
     */
    select?: AdminAuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminAuditLog
     */
    omit?: AdminAuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminAuditLogInclude<ExtArgs> | null
    where?: AdminAuditLogWhereInput
    orderBy?: AdminAuditLogOrderByWithRelationInput | AdminAuditLogOrderByWithRelationInput[]
    cursor?: AdminAuditLogWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AdminAuditLogScalarFieldEnum | AdminAuditLogScalarFieldEnum[]
  }

  /**
   * PlatformAdmin.sessions
   */
  export type PlatformAdmin$sessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminSession
     */
    select?: AdminSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminSession
     */
    omit?: AdminSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminSessionInclude<ExtArgs> | null
    where?: AdminSessionWhereInput
    orderBy?: AdminSessionOrderByWithRelationInput | AdminSessionOrderByWithRelationInput[]
    cursor?: AdminSessionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AdminSessionScalarFieldEnum | AdminSessionScalarFieldEnum[]
  }

  /**
   * PlatformAdmin without action
   */
  export type PlatformAdminDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlatformAdmin
     */
    select?: PlatformAdminSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PlatformAdmin
     */
    omit?: PlatformAdminOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlatformAdminInclude<ExtArgs> | null
  }


  /**
   * Model AdminAuditLog
   */

  export type AggregateAdminAuditLog = {
    _count: AdminAuditLogCountAggregateOutputType | null
    _min: AdminAuditLogMinAggregateOutputType | null
    _max: AdminAuditLogMaxAggregateOutputType | null
  }

  export type AdminAuditLogMinAggregateOutputType = {
    id: string | null
    adminId: string | null
    action: string | null
    resource: string | null
    resourceType: string | null
    ipAddress: string | null
    userAgent: string | null
    timestamp: Date | null
  }

  export type AdminAuditLogMaxAggregateOutputType = {
    id: string | null
    adminId: string | null
    action: string | null
    resource: string | null
    resourceType: string | null
    ipAddress: string | null
    userAgent: string | null
    timestamp: Date | null
  }

  export type AdminAuditLogCountAggregateOutputType = {
    id: number
    adminId: number
    action: number
    resource: number
    resourceType: number
    details: number
    ipAddress: number
    userAgent: number
    timestamp: number
    _all: number
  }


  export type AdminAuditLogMinAggregateInputType = {
    id?: true
    adminId?: true
    action?: true
    resource?: true
    resourceType?: true
    ipAddress?: true
    userAgent?: true
    timestamp?: true
  }

  export type AdminAuditLogMaxAggregateInputType = {
    id?: true
    adminId?: true
    action?: true
    resource?: true
    resourceType?: true
    ipAddress?: true
    userAgent?: true
    timestamp?: true
  }

  export type AdminAuditLogCountAggregateInputType = {
    id?: true
    adminId?: true
    action?: true
    resource?: true
    resourceType?: true
    details?: true
    ipAddress?: true
    userAgent?: true
    timestamp?: true
    _all?: true
  }

  export type AdminAuditLogAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AdminAuditLog to aggregate.
     */
    where?: AdminAuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AdminAuditLogs to fetch.
     */
    orderBy?: AdminAuditLogOrderByWithRelationInput | AdminAuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AdminAuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AdminAuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AdminAuditLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AdminAuditLogs
    **/
    _count?: true | AdminAuditLogCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AdminAuditLogMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AdminAuditLogMaxAggregateInputType
  }

  export type GetAdminAuditLogAggregateType<T extends AdminAuditLogAggregateArgs> = {
        [P in keyof T & keyof AggregateAdminAuditLog]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAdminAuditLog[P]>
      : GetScalarType<T[P], AggregateAdminAuditLog[P]>
  }




  export type AdminAuditLogGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AdminAuditLogWhereInput
    orderBy?: AdminAuditLogOrderByWithAggregationInput | AdminAuditLogOrderByWithAggregationInput[]
    by: AdminAuditLogScalarFieldEnum[] | AdminAuditLogScalarFieldEnum
    having?: AdminAuditLogScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AdminAuditLogCountAggregateInputType | true
    _min?: AdminAuditLogMinAggregateInputType
    _max?: AdminAuditLogMaxAggregateInputType
  }

  export type AdminAuditLogGroupByOutputType = {
    id: string
    adminId: string
    action: string
    resource: string | null
    resourceType: string | null
    details: JsonValue | null
    ipAddress: string
    userAgent: string | null
    timestamp: Date
    _count: AdminAuditLogCountAggregateOutputType | null
    _min: AdminAuditLogMinAggregateOutputType | null
    _max: AdminAuditLogMaxAggregateOutputType | null
  }

  type GetAdminAuditLogGroupByPayload<T extends AdminAuditLogGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AdminAuditLogGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AdminAuditLogGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AdminAuditLogGroupByOutputType[P]>
            : GetScalarType<T[P], AdminAuditLogGroupByOutputType[P]>
        }
      >
    >


  export type AdminAuditLogSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    adminId?: boolean
    action?: boolean
    resource?: boolean
    resourceType?: boolean
    details?: boolean
    ipAddress?: boolean
    userAgent?: boolean
    timestamp?: boolean
    admin?: boolean | PlatformAdminDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["adminAuditLog"]>

  export type AdminAuditLogSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    adminId?: boolean
    action?: boolean
    resource?: boolean
    resourceType?: boolean
    details?: boolean
    ipAddress?: boolean
    userAgent?: boolean
    timestamp?: boolean
    admin?: boolean | PlatformAdminDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["adminAuditLog"]>

  export type AdminAuditLogSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    adminId?: boolean
    action?: boolean
    resource?: boolean
    resourceType?: boolean
    details?: boolean
    ipAddress?: boolean
    userAgent?: boolean
    timestamp?: boolean
    admin?: boolean | PlatformAdminDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["adminAuditLog"]>

  export type AdminAuditLogSelectScalar = {
    id?: boolean
    adminId?: boolean
    action?: boolean
    resource?: boolean
    resourceType?: boolean
    details?: boolean
    ipAddress?: boolean
    userAgent?: boolean
    timestamp?: boolean
  }

  export type AdminAuditLogOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "adminId" | "action" | "resource" | "resourceType" | "details" | "ipAddress" | "userAgent" | "timestamp", ExtArgs["result"]["adminAuditLog"]>
  export type AdminAuditLogInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    admin?: boolean | PlatformAdminDefaultArgs<ExtArgs>
  }
  export type AdminAuditLogIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    admin?: boolean | PlatformAdminDefaultArgs<ExtArgs>
  }
  export type AdminAuditLogIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    admin?: boolean | PlatformAdminDefaultArgs<ExtArgs>
  }

  export type $AdminAuditLogPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AdminAuditLog"
    objects: {
      admin: Prisma.$PlatformAdminPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      adminId: string
      action: string
      resource: string | null
      resourceType: string | null
      details: Prisma.JsonValue | null
      ipAddress: string
      userAgent: string | null
      timestamp: Date
    }, ExtArgs["result"]["adminAuditLog"]>
    composites: {}
  }

  type AdminAuditLogGetPayload<S extends boolean | null | undefined | AdminAuditLogDefaultArgs> = $Result.GetResult<Prisma.$AdminAuditLogPayload, S>

  type AdminAuditLogCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AdminAuditLogFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AdminAuditLogCountAggregateInputType | true
    }

  export interface AdminAuditLogDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AdminAuditLog'], meta: { name: 'AdminAuditLog' } }
    /**
     * Find zero or one AdminAuditLog that matches the filter.
     * @param {AdminAuditLogFindUniqueArgs} args - Arguments to find a AdminAuditLog
     * @example
     * // Get one AdminAuditLog
     * const adminAuditLog = await prisma.adminAuditLog.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AdminAuditLogFindUniqueArgs>(args: SelectSubset<T, AdminAuditLogFindUniqueArgs<ExtArgs>>): Prisma__AdminAuditLogClient<$Result.GetResult<Prisma.$AdminAuditLogPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AdminAuditLog that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AdminAuditLogFindUniqueOrThrowArgs} args - Arguments to find a AdminAuditLog
     * @example
     * // Get one AdminAuditLog
     * const adminAuditLog = await prisma.adminAuditLog.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AdminAuditLogFindUniqueOrThrowArgs>(args: SelectSubset<T, AdminAuditLogFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AdminAuditLogClient<$Result.GetResult<Prisma.$AdminAuditLogPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AdminAuditLog that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AdminAuditLogFindFirstArgs} args - Arguments to find a AdminAuditLog
     * @example
     * // Get one AdminAuditLog
     * const adminAuditLog = await prisma.adminAuditLog.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AdminAuditLogFindFirstArgs>(args?: SelectSubset<T, AdminAuditLogFindFirstArgs<ExtArgs>>): Prisma__AdminAuditLogClient<$Result.GetResult<Prisma.$AdminAuditLogPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AdminAuditLog that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AdminAuditLogFindFirstOrThrowArgs} args - Arguments to find a AdminAuditLog
     * @example
     * // Get one AdminAuditLog
     * const adminAuditLog = await prisma.adminAuditLog.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AdminAuditLogFindFirstOrThrowArgs>(args?: SelectSubset<T, AdminAuditLogFindFirstOrThrowArgs<ExtArgs>>): Prisma__AdminAuditLogClient<$Result.GetResult<Prisma.$AdminAuditLogPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AdminAuditLogs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AdminAuditLogFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AdminAuditLogs
     * const adminAuditLogs = await prisma.adminAuditLog.findMany()
     * 
     * // Get first 10 AdminAuditLogs
     * const adminAuditLogs = await prisma.adminAuditLog.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const adminAuditLogWithIdOnly = await prisma.adminAuditLog.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AdminAuditLogFindManyArgs>(args?: SelectSubset<T, AdminAuditLogFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AdminAuditLogPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AdminAuditLog.
     * @param {AdminAuditLogCreateArgs} args - Arguments to create a AdminAuditLog.
     * @example
     * // Create one AdminAuditLog
     * const AdminAuditLog = await prisma.adminAuditLog.create({
     *   data: {
     *     // ... data to create a AdminAuditLog
     *   }
     * })
     * 
     */
    create<T extends AdminAuditLogCreateArgs>(args: SelectSubset<T, AdminAuditLogCreateArgs<ExtArgs>>): Prisma__AdminAuditLogClient<$Result.GetResult<Prisma.$AdminAuditLogPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AdminAuditLogs.
     * @param {AdminAuditLogCreateManyArgs} args - Arguments to create many AdminAuditLogs.
     * @example
     * // Create many AdminAuditLogs
     * const adminAuditLog = await prisma.adminAuditLog.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AdminAuditLogCreateManyArgs>(args?: SelectSubset<T, AdminAuditLogCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AdminAuditLogs and returns the data saved in the database.
     * @param {AdminAuditLogCreateManyAndReturnArgs} args - Arguments to create many AdminAuditLogs.
     * @example
     * // Create many AdminAuditLogs
     * const adminAuditLog = await prisma.adminAuditLog.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AdminAuditLogs and only return the `id`
     * const adminAuditLogWithIdOnly = await prisma.adminAuditLog.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AdminAuditLogCreateManyAndReturnArgs>(args?: SelectSubset<T, AdminAuditLogCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AdminAuditLogPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AdminAuditLog.
     * @param {AdminAuditLogDeleteArgs} args - Arguments to delete one AdminAuditLog.
     * @example
     * // Delete one AdminAuditLog
     * const AdminAuditLog = await prisma.adminAuditLog.delete({
     *   where: {
     *     // ... filter to delete one AdminAuditLog
     *   }
     * })
     * 
     */
    delete<T extends AdminAuditLogDeleteArgs>(args: SelectSubset<T, AdminAuditLogDeleteArgs<ExtArgs>>): Prisma__AdminAuditLogClient<$Result.GetResult<Prisma.$AdminAuditLogPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AdminAuditLog.
     * @param {AdminAuditLogUpdateArgs} args - Arguments to update one AdminAuditLog.
     * @example
     * // Update one AdminAuditLog
     * const adminAuditLog = await prisma.adminAuditLog.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AdminAuditLogUpdateArgs>(args: SelectSubset<T, AdminAuditLogUpdateArgs<ExtArgs>>): Prisma__AdminAuditLogClient<$Result.GetResult<Prisma.$AdminAuditLogPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AdminAuditLogs.
     * @param {AdminAuditLogDeleteManyArgs} args - Arguments to filter AdminAuditLogs to delete.
     * @example
     * // Delete a few AdminAuditLogs
     * const { count } = await prisma.adminAuditLog.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AdminAuditLogDeleteManyArgs>(args?: SelectSubset<T, AdminAuditLogDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AdminAuditLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AdminAuditLogUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AdminAuditLogs
     * const adminAuditLog = await prisma.adminAuditLog.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AdminAuditLogUpdateManyArgs>(args: SelectSubset<T, AdminAuditLogUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AdminAuditLogs and returns the data updated in the database.
     * @param {AdminAuditLogUpdateManyAndReturnArgs} args - Arguments to update many AdminAuditLogs.
     * @example
     * // Update many AdminAuditLogs
     * const adminAuditLog = await prisma.adminAuditLog.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AdminAuditLogs and only return the `id`
     * const adminAuditLogWithIdOnly = await prisma.adminAuditLog.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AdminAuditLogUpdateManyAndReturnArgs>(args: SelectSubset<T, AdminAuditLogUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AdminAuditLogPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AdminAuditLog.
     * @param {AdminAuditLogUpsertArgs} args - Arguments to update or create a AdminAuditLog.
     * @example
     * // Update or create a AdminAuditLog
     * const adminAuditLog = await prisma.adminAuditLog.upsert({
     *   create: {
     *     // ... data to create a AdminAuditLog
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AdminAuditLog we want to update
     *   }
     * })
     */
    upsert<T extends AdminAuditLogUpsertArgs>(args: SelectSubset<T, AdminAuditLogUpsertArgs<ExtArgs>>): Prisma__AdminAuditLogClient<$Result.GetResult<Prisma.$AdminAuditLogPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AdminAuditLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AdminAuditLogCountArgs} args - Arguments to filter AdminAuditLogs to count.
     * @example
     * // Count the number of AdminAuditLogs
     * const count = await prisma.adminAuditLog.count({
     *   where: {
     *     // ... the filter for the AdminAuditLogs we want to count
     *   }
     * })
    **/
    count<T extends AdminAuditLogCountArgs>(
      args?: Subset<T, AdminAuditLogCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AdminAuditLogCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AdminAuditLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AdminAuditLogAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AdminAuditLogAggregateArgs>(args: Subset<T, AdminAuditLogAggregateArgs>): Prisma.PrismaPromise<GetAdminAuditLogAggregateType<T>>

    /**
     * Group by AdminAuditLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AdminAuditLogGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AdminAuditLogGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AdminAuditLogGroupByArgs['orderBy'] }
        : { orderBy?: AdminAuditLogGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AdminAuditLogGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAdminAuditLogGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AdminAuditLog model
   */
  readonly fields: AdminAuditLogFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AdminAuditLog.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AdminAuditLogClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    admin<T extends PlatformAdminDefaultArgs<ExtArgs> = {}>(args?: Subset<T, PlatformAdminDefaultArgs<ExtArgs>>): Prisma__PlatformAdminClient<$Result.GetResult<Prisma.$PlatformAdminPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AdminAuditLog model
   */
  interface AdminAuditLogFieldRefs {
    readonly id: FieldRef<"AdminAuditLog", 'String'>
    readonly adminId: FieldRef<"AdminAuditLog", 'String'>
    readonly action: FieldRef<"AdminAuditLog", 'String'>
    readonly resource: FieldRef<"AdminAuditLog", 'String'>
    readonly resourceType: FieldRef<"AdminAuditLog", 'String'>
    readonly details: FieldRef<"AdminAuditLog", 'Json'>
    readonly ipAddress: FieldRef<"AdminAuditLog", 'String'>
    readonly userAgent: FieldRef<"AdminAuditLog", 'String'>
    readonly timestamp: FieldRef<"AdminAuditLog", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AdminAuditLog findUnique
   */
  export type AdminAuditLogFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminAuditLog
     */
    select?: AdminAuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminAuditLog
     */
    omit?: AdminAuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminAuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AdminAuditLog to fetch.
     */
    where: AdminAuditLogWhereUniqueInput
  }

  /**
   * AdminAuditLog findUniqueOrThrow
   */
  export type AdminAuditLogFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminAuditLog
     */
    select?: AdminAuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminAuditLog
     */
    omit?: AdminAuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminAuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AdminAuditLog to fetch.
     */
    where: AdminAuditLogWhereUniqueInput
  }

  /**
   * AdminAuditLog findFirst
   */
  export type AdminAuditLogFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminAuditLog
     */
    select?: AdminAuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminAuditLog
     */
    omit?: AdminAuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminAuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AdminAuditLog to fetch.
     */
    where?: AdminAuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AdminAuditLogs to fetch.
     */
    orderBy?: AdminAuditLogOrderByWithRelationInput | AdminAuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AdminAuditLogs.
     */
    cursor?: AdminAuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AdminAuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AdminAuditLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AdminAuditLogs.
     */
    distinct?: AdminAuditLogScalarFieldEnum | AdminAuditLogScalarFieldEnum[]
  }

  /**
   * AdminAuditLog findFirstOrThrow
   */
  export type AdminAuditLogFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminAuditLog
     */
    select?: AdminAuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminAuditLog
     */
    omit?: AdminAuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminAuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AdminAuditLog to fetch.
     */
    where?: AdminAuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AdminAuditLogs to fetch.
     */
    orderBy?: AdminAuditLogOrderByWithRelationInput | AdminAuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AdminAuditLogs.
     */
    cursor?: AdminAuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AdminAuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AdminAuditLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AdminAuditLogs.
     */
    distinct?: AdminAuditLogScalarFieldEnum | AdminAuditLogScalarFieldEnum[]
  }

  /**
   * AdminAuditLog findMany
   */
  export type AdminAuditLogFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminAuditLog
     */
    select?: AdminAuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminAuditLog
     */
    omit?: AdminAuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminAuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AdminAuditLogs to fetch.
     */
    where?: AdminAuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AdminAuditLogs to fetch.
     */
    orderBy?: AdminAuditLogOrderByWithRelationInput | AdminAuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AdminAuditLogs.
     */
    cursor?: AdminAuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AdminAuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AdminAuditLogs.
     */
    skip?: number
    distinct?: AdminAuditLogScalarFieldEnum | AdminAuditLogScalarFieldEnum[]
  }

  /**
   * AdminAuditLog create
   */
  export type AdminAuditLogCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminAuditLog
     */
    select?: AdminAuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminAuditLog
     */
    omit?: AdminAuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminAuditLogInclude<ExtArgs> | null
    /**
     * The data needed to create a AdminAuditLog.
     */
    data: XOR<AdminAuditLogCreateInput, AdminAuditLogUncheckedCreateInput>
  }

  /**
   * AdminAuditLog createMany
   */
  export type AdminAuditLogCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AdminAuditLogs.
     */
    data: AdminAuditLogCreateManyInput | AdminAuditLogCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AdminAuditLog createManyAndReturn
   */
  export type AdminAuditLogCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminAuditLog
     */
    select?: AdminAuditLogSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AdminAuditLog
     */
    omit?: AdminAuditLogOmit<ExtArgs> | null
    /**
     * The data used to create many AdminAuditLogs.
     */
    data: AdminAuditLogCreateManyInput | AdminAuditLogCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminAuditLogIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * AdminAuditLog update
   */
  export type AdminAuditLogUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminAuditLog
     */
    select?: AdminAuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminAuditLog
     */
    omit?: AdminAuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminAuditLogInclude<ExtArgs> | null
    /**
     * The data needed to update a AdminAuditLog.
     */
    data: XOR<AdminAuditLogUpdateInput, AdminAuditLogUncheckedUpdateInput>
    /**
     * Choose, which AdminAuditLog to update.
     */
    where: AdminAuditLogWhereUniqueInput
  }

  /**
   * AdminAuditLog updateMany
   */
  export type AdminAuditLogUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AdminAuditLogs.
     */
    data: XOR<AdminAuditLogUpdateManyMutationInput, AdminAuditLogUncheckedUpdateManyInput>
    /**
     * Filter which AdminAuditLogs to update
     */
    where?: AdminAuditLogWhereInput
    /**
     * Limit how many AdminAuditLogs to update.
     */
    limit?: number
  }

  /**
   * AdminAuditLog updateManyAndReturn
   */
  export type AdminAuditLogUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminAuditLog
     */
    select?: AdminAuditLogSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AdminAuditLog
     */
    omit?: AdminAuditLogOmit<ExtArgs> | null
    /**
     * The data used to update AdminAuditLogs.
     */
    data: XOR<AdminAuditLogUpdateManyMutationInput, AdminAuditLogUncheckedUpdateManyInput>
    /**
     * Filter which AdminAuditLogs to update
     */
    where?: AdminAuditLogWhereInput
    /**
     * Limit how many AdminAuditLogs to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminAuditLogIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * AdminAuditLog upsert
   */
  export type AdminAuditLogUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminAuditLog
     */
    select?: AdminAuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminAuditLog
     */
    omit?: AdminAuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminAuditLogInclude<ExtArgs> | null
    /**
     * The filter to search for the AdminAuditLog to update in case it exists.
     */
    where: AdminAuditLogWhereUniqueInput
    /**
     * In case the AdminAuditLog found by the `where` argument doesn't exist, create a new AdminAuditLog with this data.
     */
    create: XOR<AdminAuditLogCreateInput, AdminAuditLogUncheckedCreateInput>
    /**
     * In case the AdminAuditLog was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AdminAuditLogUpdateInput, AdminAuditLogUncheckedUpdateInput>
  }

  /**
   * AdminAuditLog delete
   */
  export type AdminAuditLogDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminAuditLog
     */
    select?: AdminAuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminAuditLog
     */
    omit?: AdminAuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminAuditLogInclude<ExtArgs> | null
    /**
     * Filter which AdminAuditLog to delete.
     */
    where: AdminAuditLogWhereUniqueInput
  }

  /**
   * AdminAuditLog deleteMany
   */
  export type AdminAuditLogDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AdminAuditLogs to delete
     */
    where?: AdminAuditLogWhereInput
    /**
     * Limit how many AdminAuditLogs to delete.
     */
    limit?: number
  }

  /**
   * AdminAuditLog without action
   */
  export type AdminAuditLogDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminAuditLog
     */
    select?: AdminAuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminAuditLog
     */
    omit?: AdminAuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminAuditLogInclude<ExtArgs> | null
  }


  /**
   * Model SystemConfig
   */

  export type AggregateSystemConfig = {
    _count: SystemConfigCountAggregateOutputType | null
    _min: SystemConfigMinAggregateOutputType | null
    _max: SystemConfigMaxAggregateOutputType | null
  }

  export type SystemConfigMinAggregateOutputType = {
    id: string | null
    key: string | null
    description: string | null
    updatedBy: string | null
    updatedAt: Date | null
    createdAt: Date | null
  }

  export type SystemConfigMaxAggregateOutputType = {
    id: string | null
    key: string | null
    description: string | null
    updatedBy: string | null
    updatedAt: Date | null
    createdAt: Date | null
  }

  export type SystemConfigCountAggregateOutputType = {
    id: number
    key: number
    value: number
    description: number
    updatedBy: number
    updatedAt: number
    createdAt: number
    _all: number
  }


  export type SystemConfigMinAggregateInputType = {
    id?: true
    key?: true
    description?: true
    updatedBy?: true
    updatedAt?: true
    createdAt?: true
  }

  export type SystemConfigMaxAggregateInputType = {
    id?: true
    key?: true
    description?: true
    updatedBy?: true
    updatedAt?: true
    createdAt?: true
  }

  export type SystemConfigCountAggregateInputType = {
    id?: true
    key?: true
    value?: true
    description?: true
    updatedBy?: true
    updatedAt?: true
    createdAt?: true
    _all?: true
  }

  export type SystemConfigAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SystemConfig to aggregate.
     */
    where?: SystemConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SystemConfigs to fetch.
     */
    orderBy?: SystemConfigOrderByWithRelationInput | SystemConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SystemConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SystemConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SystemConfigs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned SystemConfigs
    **/
    _count?: true | SystemConfigCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SystemConfigMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SystemConfigMaxAggregateInputType
  }

  export type GetSystemConfigAggregateType<T extends SystemConfigAggregateArgs> = {
        [P in keyof T & keyof AggregateSystemConfig]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSystemConfig[P]>
      : GetScalarType<T[P], AggregateSystemConfig[P]>
  }




  export type SystemConfigGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SystemConfigWhereInput
    orderBy?: SystemConfigOrderByWithAggregationInput | SystemConfigOrderByWithAggregationInput[]
    by: SystemConfigScalarFieldEnum[] | SystemConfigScalarFieldEnum
    having?: SystemConfigScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SystemConfigCountAggregateInputType | true
    _min?: SystemConfigMinAggregateInputType
    _max?: SystemConfigMaxAggregateInputType
  }

  export type SystemConfigGroupByOutputType = {
    id: string
    key: string
    value: JsonValue
    description: string | null
    updatedBy: string | null
    updatedAt: Date
    createdAt: Date
    _count: SystemConfigCountAggregateOutputType | null
    _min: SystemConfigMinAggregateOutputType | null
    _max: SystemConfigMaxAggregateOutputType | null
  }

  type GetSystemConfigGroupByPayload<T extends SystemConfigGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SystemConfigGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SystemConfigGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SystemConfigGroupByOutputType[P]>
            : GetScalarType<T[P], SystemConfigGroupByOutputType[P]>
        }
      >
    >


  export type SystemConfigSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    key?: boolean
    value?: boolean
    description?: boolean
    updatedBy?: boolean
    updatedAt?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["systemConfig"]>

  export type SystemConfigSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    key?: boolean
    value?: boolean
    description?: boolean
    updatedBy?: boolean
    updatedAt?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["systemConfig"]>

  export type SystemConfigSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    key?: boolean
    value?: boolean
    description?: boolean
    updatedBy?: boolean
    updatedAt?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["systemConfig"]>

  export type SystemConfigSelectScalar = {
    id?: boolean
    key?: boolean
    value?: boolean
    description?: boolean
    updatedBy?: boolean
    updatedAt?: boolean
    createdAt?: boolean
  }

  export type SystemConfigOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "key" | "value" | "description" | "updatedBy" | "updatedAt" | "createdAt", ExtArgs["result"]["systemConfig"]>

  export type $SystemConfigPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "SystemConfig"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      key: string
      value: Prisma.JsonValue
      description: string | null
      updatedBy: string | null
      updatedAt: Date
      createdAt: Date
    }, ExtArgs["result"]["systemConfig"]>
    composites: {}
  }

  type SystemConfigGetPayload<S extends boolean | null | undefined | SystemConfigDefaultArgs> = $Result.GetResult<Prisma.$SystemConfigPayload, S>

  type SystemConfigCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SystemConfigFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SystemConfigCountAggregateInputType | true
    }

  export interface SystemConfigDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['SystemConfig'], meta: { name: 'SystemConfig' } }
    /**
     * Find zero or one SystemConfig that matches the filter.
     * @param {SystemConfigFindUniqueArgs} args - Arguments to find a SystemConfig
     * @example
     * // Get one SystemConfig
     * const systemConfig = await prisma.systemConfig.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SystemConfigFindUniqueArgs>(args: SelectSubset<T, SystemConfigFindUniqueArgs<ExtArgs>>): Prisma__SystemConfigClient<$Result.GetResult<Prisma.$SystemConfigPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one SystemConfig that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SystemConfigFindUniqueOrThrowArgs} args - Arguments to find a SystemConfig
     * @example
     * // Get one SystemConfig
     * const systemConfig = await prisma.systemConfig.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SystemConfigFindUniqueOrThrowArgs>(args: SelectSubset<T, SystemConfigFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SystemConfigClient<$Result.GetResult<Prisma.$SystemConfigPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first SystemConfig that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SystemConfigFindFirstArgs} args - Arguments to find a SystemConfig
     * @example
     * // Get one SystemConfig
     * const systemConfig = await prisma.systemConfig.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SystemConfigFindFirstArgs>(args?: SelectSubset<T, SystemConfigFindFirstArgs<ExtArgs>>): Prisma__SystemConfigClient<$Result.GetResult<Prisma.$SystemConfigPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first SystemConfig that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SystemConfigFindFirstOrThrowArgs} args - Arguments to find a SystemConfig
     * @example
     * // Get one SystemConfig
     * const systemConfig = await prisma.systemConfig.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SystemConfigFindFirstOrThrowArgs>(args?: SelectSubset<T, SystemConfigFindFirstOrThrowArgs<ExtArgs>>): Prisma__SystemConfigClient<$Result.GetResult<Prisma.$SystemConfigPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more SystemConfigs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SystemConfigFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all SystemConfigs
     * const systemConfigs = await prisma.systemConfig.findMany()
     * 
     * // Get first 10 SystemConfigs
     * const systemConfigs = await prisma.systemConfig.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const systemConfigWithIdOnly = await prisma.systemConfig.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SystemConfigFindManyArgs>(args?: SelectSubset<T, SystemConfigFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SystemConfigPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a SystemConfig.
     * @param {SystemConfigCreateArgs} args - Arguments to create a SystemConfig.
     * @example
     * // Create one SystemConfig
     * const SystemConfig = await prisma.systemConfig.create({
     *   data: {
     *     // ... data to create a SystemConfig
     *   }
     * })
     * 
     */
    create<T extends SystemConfigCreateArgs>(args: SelectSubset<T, SystemConfigCreateArgs<ExtArgs>>): Prisma__SystemConfigClient<$Result.GetResult<Prisma.$SystemConfigPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many SystemConfigs.
     * @param {SystemConfigCreateManyArgs} args - Arguments to create many SystemConfigs.
     * @example
     * // Create many SystemConfigs
     * const systemConfig = await prisma.systemConfig.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SystemConfigCreateManyArgs>(args?: SelectSubset<T, SystemConfigCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many SystemConfigs and returns the data saved in the database.
     * @param {SystemConfigCreateManyAndReturnArgs} args - Arguments to create many SystemConfigs.
     * @example
     * // Create many SystemConfigs
     * const systemConfig = await prisma.systemConfig.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many SystemConfigs and only return the `id`
     * const systemConfigWithIdOnly = await prisma.systemConfig.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SystemConfigCreateManyAndReturnArgs>(args?: SelectSubset<T, SystemConfigCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SystemConfigPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a SystemConfig.
     * @param {SystemConfigDeleteArgs} args - Arguments to delete one SystemConfig.
     * @example
     * // Delete one SystemConfig
     * const SystemConfig = await prisma.systemConfig.delete({
     *   where: {
     *     // ... filter to delete one SystemConfig
     *   }
     * })
     * 
     */
    delete<T extends SystemConfigDeleteArgs>(args: SelectSubset<T, SystemConfigDeleteArgs<ExtArgs>>): Prisma__SystemConfigClient<$Result.GetResult<Prisma.$SystemConfigPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one SystemConfig.
     * @param {SystemConfigUpdateArgs} args - Arguments to update one SystemConfig.
     * @example
     * // Update one SystemConfig
     * const systemConfig = await prisma.systemConfig.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SystemConfigUpdateArgs>(args: SelectSubset<T, SystemConfigUpdateArgs<ExtArgs>>): Prisma__SystemConfigClient<$Result.GetResult<Prisma.$SystemConfigPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more SystemConfigs.
     * @param {SystemConfigDeleteManyArgs} args - Arguments to filter SystemConfigs to delete.
     * @example
     * // Delete a few SystemConfigs
     * const { count } = await prisma.systemConfig.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SystemConfigDeleteManyArgs>(args?: SelectSubset<T, SystemConfigDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SystemConfigs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SystemConfigUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many SystemConfigs
     * const systemConfig = await prisma.systemConfig.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SystemConfigUpdateManyArgs>(args: SelectSubset<T, SystemConfigUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SystemConfigs and returns the data updated in the database.
     * @param {SystemConfigUpdateManyAndReturnArgs} args - Arguments to update many SystemConfigs.
     * @example
     * // Update many SystemConfigs
     * const systemConfig = await prisma.systemConfig.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more SystemConfigs and only return the `id`
     * const systemConfigWithIdOnly = await prisma.systemConfig.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends SystemConfigUpdateManyAndReturnArgs>(args: SelectSubset<T, SystemConfigUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SystemConfigPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one SystemConfig.
     * @param {SystemConfigUpsertArgs} args - Arguments to update or create a SystemConfig.
     * @example
     * // Update or create a SystemConfig
     * const systemConfig = await prisma.systemConfig.upsert({
     *   create: {
     *     // ... data to create a SystemConfig
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the SystemConfig we want to update
     *   }
     * })
     */
    upsert<T extends SystemConfigUpsertArgs>(args: SelectSubset<T, SystemConfigUpsertArgs<ExtArgs>>): Prisma__SystemConfigClient<$Result.GetResult<Prisma.$SystemConfigPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of SystemConfigs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SystemConfigCountArgs} args - Arguments to filter SystemConfigs to count.
     * @example
     * // Count the number of SystemConfigs
     * const count = await prisma.systemConfig.count({
     *   where: {
     *     // ... the filter for the SystemConfigs we want to count
     *   }
     * })
    **/
    count<T extends SystemConfigCountArgs>(
      args?: Subset<T, SystemConfigCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SystemConfigCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a SystemConfig.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SystemConfigAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SystemConfigAggregateArgs>(args: Subset<T, SystemConfigAggregateArgs>): Prisma.PrismaPromise<GetSystemConfigAggregateType<T>>

    /**
     * Group by SystemConfig.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SystemConfigGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SystemConfigGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SystemConfigGroupByArgs['orderBy'] }
        : { orderBy?: SystemConfigGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SystemConfigGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSystemConfigGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the SystemConfig model
   */
  readonly fields: SystemConfigFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for SystemConfig.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SystemConfigClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the SystemConfig model
   */
  interface SystemConfigFieldRefs {
    readonly id: FieldRef<"SystemConfig", 'String'>
    readonly key: FieldRef<"SystemConfig", 'String'>
    readonly value: FieldRef<"SystemConfig", 'Json'>
    readonly description: FieldRef<"SystemConfig", 'String'>
    readonly updatedBy: FieldRef<"SystemConfig", 'String'>
    readonly updatedAt: FieldRef<"SystemConfig", 'DateTime'>
    readonly createdAt: FieldRef<"SystemConfig", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * SystemConfig findUnique
   */
  export type SystemConfigFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemConfig
     */
    select?: SystemConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SystemConfig
     */
    omit?: SystemConfigOmit<ExtArgs> | null
    /**
     * Filter, which SystemConfig to fetch.
     */
    where: SystemConfigWhereUniqueInput
  }

  /**
   * SystemConfig findUniqueOrThrow
   */
  export type SystemConfigFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemConfig
     */
    select?: SystemConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SystemConfig
     */
    omit?: SystemConfigOmit<ExtArgs> | null
    /**
     * Filter, which SystemConfig to fetch.
     */
    where: SystemConfigWhereUniqueInput
  }

  /**
   * SystemConfig findFirst
   */
  export type SystemConfigFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemConfig
     */
    select?: SystemConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SystemConfig
     */
    omit?: SystemConfigOmit<ExtArgs> | null
    /**
     * Filter, which SystemConfig to fetch.
     */
    where?: SystemConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SystemConfigs to fetch.
     */
    orderBy?: SystemConfigOrderByWithRelationInput | SystemConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SystemConfigs.
     */
    cursor?: SystemConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SystemConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SystemConfigs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SystemConfigs.
     */
    distinct?: SystemConfigScalarFieldEnum | SystemConfigScalarFieldEnum[]
  }

  /**
   * SystemConfig findFirstOrThrow
   */
  export type SystemConfigFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemConfig
     */
    select?: SystemConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SystemConfig
     */
    omit?: SystemConfigOmit<ExtArgs> | null
    /**
     * Filter, which SystemConfig to fetch.
     */
    where?: SystemConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SystemConfigs to fetch.
     */
    orderBy?: SystemConfigOrderByWithRelationInput | SystemConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SystemConfigs.
     */
    cursor?: SystemConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SystemConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SystemConfigs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SystemConfigs.
     */
    distinct?: SystemConfigScalarFieldEnum | SystemConfigScalarFieldEnum[]
  }

  /**
   * SystemConfig findMany
   */
  export type SystemConfigFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemConfig
     */
    select?: SystemConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SystemConfig
     */
    omit?: SystemConfigOmit<ExtArgs> | null
    /**
     * Filter, which SystemConfigs to fetch.
     */
    where?: SystemConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SystemConfigs to fetch.
     */
    orderBy?: SystemConfigOrderByWithRelationInput | SystemConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing SystemConfigs.
     */
    cursor?: SystemConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SystemConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SystemConfigs.
     */
    skip?: number
    distinct?: SystemConfigScalarFieldEnum | SystemConfigScalarFieldEnum[]
  }

  /**
   * SystemConfig create
   */
  export type SystemConfigCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemConfig
     */
    select?: SystemConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SystemConfig
     */
    omit?: SystemConfigOmit<ExtArgs> | null
    /**
     * The data needed to create a SystemConfig.
     */
    data: XOR<SystemConfigCreateInput, SystemConfigUncheckedCreateInput>
  }

  /**
   * SystemConfig createMany
   */
  export type SystemConfigCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many SystemConfigs.
     */
    data: SystemConfigCreateManyInput | SystemConfigCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * SystemConfig createManyAndReturn
   */
  export type SystemConfigCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemConfig
     */
    select?: SystemConfigSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the SystemConfig
     */
    omit?: SystemConfigOmit<ExtArgs> | null
    /**
     * The data used to create many SystemConfigs.
     */
    data: SystemConfigCreateManyInput | SystemConfigCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * SystemConfig update
   */
  export type SystemConfigUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemConfig
     */
    select?: SystemConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SystemConfig
     */
    omit?: SystemConfigOmit<ExtArgs> | null
    /**
     * The data needed to update a SystemConfig.
     */
    data: XOR<SystemConfigUpdateInput, SystemConfigUncheckedUpdateInput>
    /**
     * Choose, which SystemConfig to update.
     */
    where: SystemConfigWhereUniqueInput
  }

  /**
   * SystemConfig updateMany
   */
  export type SystemConfigUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update SystemConfigs.
     */
    data: XOR<SystemConfigUpdateManyMutationInput, SystemConfigUncheckedUpdateManyInput>
    /**
     * Filter which SystemConfigs to update
     */
    where?: SystemConfigWhereInput
    /**
     * Limit how many SystemConfigs to update.
     */
    limit?: number
  }

  /**
   * SystemConfig updateManyAndReturn
   */
  export type SystemConfigUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemConfig
     */
    select?: SystemConfigSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the SystemConfig
     */
    omit?: SystemConfigOmit<ExtArgs> | null
    /**
     * The data used to update SystemConfigs.
     */
    data: XOR<SystemConfigUpdateManyMutationInput, SystemConfigUncheckedUpdateManyInput>
    /**
     * Filter which SystemConfigs to update
     */
    where?: SystemConfigWhereInput
    /**
     * Limit how many SystemConfigs to update.
     */
    limit?: number
  }

  /**
   * SystemConfig upsert
   */
  export type SystemConfigUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemConfig
     */
    select?: SystemConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SystemConfig
     */
    omit?: SystemConfigOmit<ExtArgs> | null
    /**
     * The filter to search for the SystemConfig to update in case it exists.
     */
    where: SystemConfigWhereUniqueInput
    /**
     * In case the SystemConfig found by the `where` argument doesn't exist, create a new SystemConfig with this data.
     */
    create: XOR<SystemConfigCreateInput, SystemConfigUncheckedCreateInput>
    /**
     * In case the SystemConfig was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SystemConfigUpdateInput, SystemConfigUncheckedUpdateInput>
  }

  /**
   * SystemConfig delete
   */
  export type SystemConfigDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemConfig
     */
    select?: SystemConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SystemConfig
     */
    omit?: SystemConfigOmit<ExtArgs> | null
    /**
     * Filter which SystemConfig to delete.
     */
    where: SystemConfigWhereUniqueInput
  }

  /**
   * SystemConfig deleteMany
   */
  export type SystemConfigDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SystemConfigs to delete
     */
    where?: SystemConfigWhereInput
    /**
     * Limit how many SystemConfigs to delete.
     */
    limit?: number
  }

  /**
   * SystemConfig without action
   */
  export type SystemConfigDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemConfig
     */
    select?: SystemConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SystemConfig
     */
    omit?: SystemConfigOmit<ExtArgs> | null
  }


  /**
   * Model AdminSession
   */

  export type AggregateAdminSession = {
    _count: AdminSessionCountAggregateOutputType | null
    _min: AdminSessionMinAggregateOutputType | null
    _max: AdminSessionMaxAggregateOutputType | null
  }

  export type AdminSessionMinAggregateOutputType = {
    id: string | null
    adminId: string | null
    token: string | null
    expiresAt: Date | null
    ipAddress: string | null
    userAgent: string | null
    isActive: boolean | null
    createdAt: Date | null
  }

  export type AdminSessionMaxAggregateOutputType = {
    id: string | null
    adminId: string | null
    token: string | null
    expiresAt: Date | null
    ipAddress: string | null
    userAgent: string | null
    isActive: boolean | null
    createdAt: Date | null
  }

  export type AdminSessionCountAggregateOutputType = {
    id: number
    adminId: number
    token: number
    expiresAt: number
    ipAddress: number
    userAgent: number
    isActive: number
    createdAt: number
    _all: number
  }


  export type AdminSessionMinAggregateInputType = {
    id?: true
    adminId?: true
    token?: true
    expiresAt?: true
    ipAddress?: true
    userAgent?: true
    isActive?: true
    createdAt?: true
  }

  export type AdminSessionMaxAggregateInputType = {
    id?: true
    adminId?: true
    token?: true
    expiresAt?: true
    ipAddress?: true
    userAgent?: true
    isActive?: true
    createdAt?: true
  }

  export type AdminSessionCountAggregateInputType = {
    id?: true
    adminId?: true
    token?: true
    expiresAt?: true
    ipAddress?: true
    userAgent?: true
    isActive?: true
    createdAt?: true
    _all?: true
  }

  export type AdminSessionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AdminSession to aggregate.
     */
    where?: AdminSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AdminSessions to fetch.
     */
    orderBy?: AdminSessionOrderByWithRelationInput | AdminSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AdminSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AdminSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AdminSessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AdminSessions
    **/
    _count?: true | AdminSessionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AdminSessionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AdminSessionMaxAggregateInputType
  }

  export type GetAdminSessionAggregateType<T extends AdminSessionAggregateArgs> = {
        [P in keyof T & keyof AggregateAdminSession]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAdminSession[P]>
      : GetScalarType<T[P], AggregateAdminSession[P]>
  }




  export type AdminSessionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AdminSessionWhereInput
    orderBy?: AdminSessionOrderByWithAggregationInput | AdminSessionOrderByWithAggregationInput[]
    by: AdminSessionScalarFieldEnum[] | AdminSessionScalarFieldEnum
    having?: AdminSessionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AdminSessionCountAggregateInputType | true
    _min?: AdminSessionMinAggregateInputType
    _max?: AdminSessionMaxAggregateInputType
  }

  export type AdminSessionGroupByOutputType = {
    id: string
    adminId: string
    token: string
    expiresAt: Date
    ipAddress: string | null
    userAgent: string | null
    isActive: boolean
    createdAt: Date
    _count: AdminSessionCountAggregateOutputType | null
    _min: AdminSessionMinAggregateOutputType | null
    _max: AdminSessionMaxAggregateOutputType | null
  }

  type GetAdminSessionGroupByPayload<T extends AdminSessionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AdminSessionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AdminSessionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AdminSessionGroupByOutputType[P]>
            : GetScalarType<T[P], AdminSessionGroupByOutputType[P]>
        }
      >
    >


  export type AdminSessionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    adminId?: boolean
    token?: boolean
    expiresAt?: boolean
    ipAddress?: boolean
    userAgent?: boolean
    isActive?: boolean
    createdAt?: boolean
    admin?: boolean | PlatformAdminDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["adminSession"]>

  export type AdminSessionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    adminId?: boolean
    token?: boolean
    expiresAt?: boolean
    ipAddress?: boolean
    userAgent?: boolean
    isActive?: boolean
    createdAt?: boolean
    admin?: boolean | PlatformAdminDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["adminSession"]>

  export type AdminSessionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    adminId?: boolean
    token?: boolean
    expiresAt?: boolean
    ipAddress?: boolean
    userAgent?: boolean
    isActive?: boolean
    createdAt?: boolean
    admin?: boolean | PlatformAdminDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["adminSession"]>

  export type AdminSessionSelectScalar = {
    id?: boolean
    adminId?: boolean
    token?: boolean
    expiresAt?: boolean
    ipAddress?: boolean
    userAgent?: boolean
    isActive?: boolean
    createdAt?: boolean
  }

  export type AdminSessionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "adminId" | "token" | "expiresAt" | "ipAddress" | "userAgent" | "isActive" | "createdAt", ExtArgs["result"]["adminSession"]>
  export type AdminSessionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    admin?: boolean | PlatformAdminDefaultArgs<ExtArgs>
  }
  export type AdminSessionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    admin?: boolean | PlatformAdminDefaultArgs<ExtArgs>
  }
  export type AdminSessionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    admin?: boolean | PlatformAdminDefaultArgs<ExtArgs>
  }

  export type $AdminSessionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AdminSession"
    objects: {
      admin: Prisma.$PlatformAdminPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      adminId: string
      token: string
      expiresAt: Date
      ipAddress: string | null
      userAgent: string | null
      isActive: boolean
      createdAt: Date
    }, ExtArgs["result"]["adminSession"]>
    composites: {}
  }

  type AdminSessionGetPayload<S extends boolean | null | undefined | AdminSessionDefaultArgs> = $Result.GetResult<Prisma.$AdminSessionPayload, S>

  type AdminSessionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AdminSessionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AdminSessionCountAggregateInputType | true
    }

  export interface AdminSessionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AdminSession'], meta: { name: 'AdminSession' } }
    /**
     * Find zero or one AdminSession that matches the filter.
     * @param {AdminSessionFindUniqueArgs} args - Arguments to find a AdminSession
     * @example
     * // Get one AdminSession
     * const adminSession = await prisma.adminSession.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AdminSessionFindUniqueArgs>(args: SelectSubset<T, AdminSessionFindUniqueArgs<ExtArgs>>): Prisma__AdminSessionClient<$Result.GetResult<Prisma.$AdminSessionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AdminSession that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AdminSessionFindUniqueOrThrowArgs} args - Arguments to find a AdminSession
     * @example
     * // Get one AdminSession
     * const adminSession = await prisma.adminSession.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AdminSessionFindUniqueOrThrowArgs>(args: SelectSubset<T, AdminSessionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AdminSessionClient<$Result.GetResult<Prisma.$AdminSessionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AdminSession that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AdminSessionFindFirstArgs} args - Arguments to find a AdminSession
     * @example
     * // Get one AdminSession
     * const adminSession = await prisma.adminSession.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AdminSessionFindFirstArgs>(args?: SelectSubset<T, AdminSessionFindFirstArgs<ExtArgs>>): Prisma__AdminSessionClient<$Result.GetResult<Prisma.$AdminSessionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AdminSession that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AdminSessionFindFirstOrThrowArgs} args - Arguments to find a AdminSession
     * @example
     * // Get one AdminSession
     * const adminSession = await prisma.adminSession.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AdminSessionFindFirstOrThrowArgs>(args?: SelectSubset<T, AdminSessionFindFirstOrThrowArgs<ExtArgs>>): Prisma__AdminSessionClient<$Result.GetResult<Prisma.$AdminSessionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AdminSessions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AdminSessionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AdminSessions
     * const adminSessions = await prisma.adminSession.findMany()
     * 
     * // Get first 10 AdminSessions
     * const adminSessions = await prisma.adminSession.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const adminSessionWithIdOnly = await prisma.adminSession.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AdminSessionFindManyArgs>(args?: SelectSubset<T, AdminSessionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AdminSessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AdminSession.
     * @param {AdminSessionCreateArgs} args - Arguments to create a AdminSession.
     * @example
     * // Create one AdminSession
     * const AdminSession = await prisma.adminSession.create({
     *   data: {
     *     // ... data to create a AdminSession
     *   }
     * })
     * 
     */
    create<T extends AdminSessionCreateArgs>(args: SelectSubset<T, AdminSessionCreateArgs<ExtArgs>>): Prisma__AdminSessionClient<$Result.GetResult<Prisma.$AdminSessionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AdminSessions.
     * @param {AdminSessionCreateManyArgs} args - Arguments to create many AdminSessions.
     * @example
     * // Create many AdminSessions
     * const adminSession = await prisma.adminSession.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AdminSessionCreateManyArgs>(args?: SelectSubset<T, AdminSessionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AdminSessions and returns the data saved in the database.
     * @param {AdminSessionCreateManyAndReturnArgs} args - Arguments to create many AdminSessions.
     * @example
     * // Create many AdminSessions
     * const adminSession = await prisma.adminSession.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AdminSessions and only return the `id`
     * const adminSessionWithIdOnly = await prisma.adminSession.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AdminSessionCreateManyAndReturnArgs>(args?: SelectSubset<T, AdminSessionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AdminSessionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AdminSession.
     * @param {AdminSessionDeleteArgs} args - Arguments to delete one AdminSession.
     * @example
     * // Delete one AdminSession
     * const AdminSession = await prisma.adminSession.delete({
     *   where: {
     *     // ... filter to delete one AdminSession
     *   }
     * })
     * 
     */
    delete<T extends AdminSessionDeleteArgs>(args: SelectSubset<T, AdminSessionDeleteArgs<ExtArgs>>): Prisma__AdminSessionClient<$Result.GetResult<Prisma.$AdminSessionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AdminSession.
     * @param {AdminSessionUpdateArgs} args - Arguments to update one AdminSession.
     * @example
     * // Update one AdminSession
     * const adminSession = await prisma.adminSession.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AdminSessionUpdateArgs>(args: SelectSubset<T, AdminSessionUpdateArgs<ExtArgs>>): Prisma__AdminSessionClient<$Result.GetResult<Prisma.$AdminSessionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AdminSessions.
     * @param {AdminSessionDeleteManyArgs} args - Arguments to filter AdminSessions to delete.
     * @example
     * // Delete a few AdminSessions
     * const { count } = await prisma.adminSession.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AdminSessionDeleteManyArgs>(args?: SelectSubset<T, AdminSessionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AdminSessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AdminSessionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AdminSessions
     * const adminSession = await prisma.adminSession.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AdminSessionUpdateManyArgs>(args: SelectSubset<T, AdminSessionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AdminSessions and returns the data updated in the database.
     * @param {AdminSessionUpdateManyAndReturnArgs} args - Arguments to update many AdminSessions.
     * @example
     * // Update many AdminSessions
     * const adminSession = await prisma.adminSession.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AdminSessions and only return the `id`
     * const adminSessionWithIdOnly = await prisma.adminSession.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AdminSessionUpdateManyAndReturnArgs>(args: SelectSubset<T, AdminSessionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AdminSessionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AdminSession.
     * @param {AdminSessionUpsertArgs} args - Arguments to update or create a AdminSession.
     * @example
     * // Update or create a AdminSession
     * const adminSession = await prisma.adminSession.upsert({
     *   create: {
     *     // ... data to create a AdminSession
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AdminSession we want to update
     *   }
     * })
     */
    upsert<T extends AdminSessionUpsertArgs>(args: SelectSubset<T, AdminSessionUpsertArgs<ExtArgs>>): Prisma__AdminSessionClient<$Result.GetResult<Prisma.$AdminSessionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AdminSessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AdminSessionCountArgs} args - Arguments to filter AdminSessions to count.
     * @example
     * // Count the number of AdminSessions
     * const count = await prisma.adminSession.count({
     *   where: {
     *     // ... the filter for the AdminSessions we want to count
     *   }
     * })
    **/
    count<T extends AdminSessionCountArgs>(
      args?: Subset<T, AdminSessionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AdminSessionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AdminSession.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AdminSessionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AdminSessionAggregateArgs>(args: Subset<T, AdminSessionAggregateArgs>): Prisma.PrismaPromise<GetAdminSessionAggregateType<T>>

    /**
     * Group by AdminSession.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AdminSessionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AdminSessionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AdminSessionGroupByArgs['orderBy'] }
        : { orderBy?: AdminSessionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AdminSessionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAdminSessionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AdminSession model
   */
  readonly fields: AdminSessionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AdminSession.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AdminSessionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    admin<T extends PlatformAdminDefaultArgs<ExtArgs> = {}>(args?: Subset<T, PlatformAdminDefaultArgs<ExtArgs>>): Prisma__PlatformAdminClient<$Result.GetResult<Prisma.$PlatformAdminPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AdminSession model
   */
  interface AdminSessionFieldRefs {
    readonly id: FieldRef<"AdminSession", 'String'>
    readonly adminId: FieldRef<"AdminSession", 'String'>
    readonly token: FieldRef<"AdminSession", 'String'>
    readonly expiresAt: FieldRef<"AdminSession", 'DateTime'>
    readonly ipAddress: FieldRef<"AdminSession", 'String'>
    readonly userAgent: FieldRef<"AdminSession", 'String'>
    readonly isActive: FieldRef<"AdminSession", 'Boolean'>
    readonly createdAt: FieldRef<"AdminSession", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AdminSession findUnique
   */
  export type AdminSessionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminSession
     */
    select?: AdminSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminSession
     */
    omit?: AdminSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminSessionInclude<ExtArgs> | null
    /**
     * Filter, which AdminSession to fetch.
     */
    where: AdminSessionWhereUniqueInput
  }

  /**
   * AdminSession findUniqueOrThrow
   */
  export type AdminSessionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminSession
     */
    select?: AdminSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminSession
     */
    omit?: AdminSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminSessionInclude<ExtArgs> | null
    /**
     * Filter, which AdminSession to fetch.
     */
    where: AdminSessionWhereUniqueInput
  }

  /**
   * AdminSession findFirst
   */
  export type AdminSessionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminSession
     */
    select?: AdminSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminSession
     */
    omit?: AdminSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminSessionInclude<ExtArgs> | null
    /**
     * Filter, which AdminSession to fetch.
     */
    where?: AdminSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AdminSessions to fetch.
     */
    orderBy?: AdminSessionOrderByWithRelationInput | AdminSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AdminSessions.
     */
    cursor?: AdminSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AdminSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AdminSessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AdminSessions.
     */
    distinct?: AdminSessionScalarFieldEnum | AdminSessionScalarFieldEnum[]
  }

  /**
   * AdminSession findFirstOrThrow
   */
  export type AdminSessionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminSession
     */
    select?: AdminSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminSession
     */
    omit?: AdminSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminSessionInclude<ExtArgs> | null
    /**
     * Filter, which AdminSession to fetch.
     */
    where?: AdminSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AdminSessions to fetch.
     */
    orderBy?: AdminSessionOrderByWithRelationInput | AdminSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AdminSessions.
     */
    cursor?: AdminSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AdminSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AdminSessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AdminSessions.
     */
    distinct?: AdminSessionScalarFieldEnum | AdminSessionScalarFieldEnum[]
  }

  /**
   * AdminSession findMany
   */
  export type AdminSessionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminSession
     */
    select?: AdminSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminSession
     */
    omit?: AdminSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminSessionInclude<ExtArgs> | null
    /**
     * Filter, which AdminSessions to fetch.
     */
    where?: AdminSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AdminSessions to fetch.
     */
    orderBy?: AdminSessionOrderByWithRelationInput | AdminSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AdminSessions.
     */
    cursor?: AdminSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AdminSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AdminSessions.
     */
    skip?: number
    distinct?: AdminSessionScalarFieldEnum | AdminSessionScalarFieldEnum[]
  }

  /**
   * AdminSession create
   */
  export type AdminSessionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminSession
     */
    select?: AdminSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminSession
     */
    omit?: AdminSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminSessionInclude<ExtArgs> | null
    /**
     * The data needed to create a AdminSession.
     */
    data: XOR<AdminSessionCreateInput, AdminSessionUncheckedCreateInput>
  }

  /**
   * AdminSession createMany
   */
  export type AdminSessionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AdminSessions.
     */
    data: AdminSessionCreateManyInput | AdminSessionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AdminSession createManyAndReturn
   */
  export type AdminSessionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminSession
     */
    select?: AdminSessionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AdminSession
     */
    omit?: AdminSessionOmit<ExtArgs> | null
    /**
     * The data used to create many AdminSessions.
     */
    data: AdminSessionCreateManyInput | AdminSessionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminSessionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * AdminSession update
   */
  export type AdminSessionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminSession
     */
    select?: AdminSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminSession
     */
    omit?: AdminSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminSessionInclude<ExtArgs> | null
    /**
     * The data needed to update a AdminSession.
     */
    data: XOR<AdminSessionUpdateInput, AdminSessionUncheckedUpdateInput>
    /**
     * Choose, which AdminSession to update.
     */
    where: AdminSessionWhereUniqueInput
  }

  /**
   * AdminSession updateMany
   */
  export type AdminSessionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AdminSessions.
     */
    data: XOR<AdminSessionUpdateManyMutationInput, AdminSessionUncheckedUpdateManyInput>
    /**
     * Filter which AdminSessions to update
     */
    where?: AdminSessionWhereInput
    /**
     * Limit how many AdminSessions to update.
     */
    limit?: number
  }

  /**
   * AdminSession updateManyAndReturn
   */
  export type AdminSessionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminSession
     */
    select?: AdminSessionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AdminSession
     */
    omit?: AdminSessionOmit<ExtArgs> | null
    /**
     * The data used to update AdminSessions.
     */
    data: XOR<AdminSessionUpdateManyMutationInput, AdminSessionUncheckedUpdateManyInput>
    /**
     * Filter which AdminSessions to update
     */
    where?: AdminSessionWhereInput
    /**
     * Limit how many AdminSessions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminSessionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * AdminSession upsert
   */
  export type AdminSessionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminSession
     */
    select?: AdminSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminSession
     */
    omit?: AdminSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminSessionInclude<ExtArgs> | null
    /**
     * The filter to search for the AdminSession to update in case it exists.
     */
    where: AdminSessionWhereUniqueInput
    /**
     * In case the AdminSession found by the `where` argument doesn't exist, create a new AdminSession with this data.
     */
    create: XOR<AdminSessionCreateInput, AdminSessionUncheckedCreateInput>
    /**
     * In case the AdminSession was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AdminSessionUpdateInput, AdminSessionUncheckedUpdateInput>
  }

  /**
   * AdminSession delete
   */
  export type AdminSessionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminSession
     */
    select?: AdminSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminSession
     */
    omit?: AdminSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminSessionInclude<ExtArgs> | null
    /**
     * Filter which AdminSession to delete.
     */
    where: AdminSessionWhereUniqueInput
  }

  /**
   * AdminSession deleteMany
   */
  export type AdminSessionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AdminSessions to delete
     */
    where?: AdminSessionWhereInput
    /**
     * Limit how many AdminSessions to delete.
     */
    limit?: number
  }

  /**
   * AdminSession without action
   */
  export type AdminSessionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminSession
     */
    select?: AdminSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminSession
     */
    omit?: AdminSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminSessionInclude<ExtArgs> | null
  }


  /**
   * Model Subscription
   */

  export type AggregateSubscription = {
    _count: SubscriptionCountAggregateOutputType | null
    _avg: SubscriptionAvgAggregateOutputType | null
    _sum: SubscriptionSumAggregateOutputType | null
    _min: SubscriptionMinAggregateOutputType | null
    _max: SubscriptionMaxAggregateOutputType | null
  }

  export type SubscriptionAvgAggregateOutputType = {
    monthlyRevenue: Decimal | null
    yearlyRevenue: Decimal | null
  }

  export type SubscriptionSumAggregateOutputType = {
    monthlyRevenue: Decimal | null
    yearlyRevenue: Decimal | null
  }

  export type SubscriptionMinAggregateOutputType = {
    id: string | null
    organizationId: string | null
    stripeSubscriptionId: string | null
    stripePriceId: string | null
    plan: $Enums.SubscriptionPlan | null
    status: $Enums.SubscriptionStatus | null
    currentPeriodStart: Date | null
    currentPeriodEnd: Date | null
    trialStart: Date | null
    trialEnd: Date | null
    canceledAt: Date | null
    cancelAtPeriodEnd: boolean | null
    monthlyRevenue: Decimal | null
    yearlyRevenue: Decimal | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SubscriptionMaxAggregateOutputType = {
    id: string | null
    organizationId: string | null
    stripeSubscriptionId: string | null
    stripePriceId: string | null
    plan: $Enums.SubscriptionPlan | null
    status: $Enums.SubscriptionStatus | null
    currentPeriodStart: Date | null
    currentPeriodEnd: Date | null
    trialStart: Date | null
    trialEnd: Date | null
    canceledAt: Date | null
    cancelAtPeriodEnd: boolean | null
    monthlyRevenue: Decimal | null
    yearlyRevenue: Decimal | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SubscriptionCountAggregateOutputType = {
    id: number
    organizationId: number
    stripeSubscriptionId: number
    stripePriceId: number
    plan: number
    status: number
    currentPeriodStart: number
    currentPeriodEnd: number
    trialStart: number
    trialEnd: number
    canceledAt: number
    cancelAtPeriodEnd: number
    monthlyRevenue: number
    yearlyRevenue: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type SubscriptionAvgAggregateInputType = {
    monthlyRevenue?: true
    yearlyRevenue?: true
  }

  export type SubscriptionSumAggregateInputType = {
    monthlyRevenue?: true
    yearlyRevenue?: true
  }

  export type SubscriptionMinAggregateInputType = {
    id?: true
    organizationId?: true
    stripeSubscriptionId?: true
    stripePriceId?: true
    plan?: true
    status?: true
    currentPeriodStart?: true
    currentPeriodEnd?: true
    trialStart?: true
    trialEnd?: true
    canceledAt?: true
    cancelAtPeriodEnd?: true
    monthlyRevenue?: true
    yearlyRevenue?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SubscriptionMaxAggregateInputType = {
    id?: true
    organizationId?: true
    stripeSubscriptionId?: true
    stripePriceId?: true
    plan?: true
    status?: true
    currentPeriodStart?: true
    currentPeriodEnd?: true
    trialStart?: true
    trialEnd?: true
    canceledAt?: true
    cancelAtPeriodEnd?: true
    monthlyRevenue?: true
    yearlyRevenue?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SubscriptionCountAggregateInputType = {
    id?: true
    organizationId?: true
    stripeSubscriptionId?: true
    stripePriceId?: true
    plan?: true
    status?: true
    currentPeriodStart?: true
    currentPeriodEnd?: true
    trialStart?: true
    trialEnd?: true
    canceledAt?: true
    cancelAtPeriodEnd?: true
    monthlyRevenue?: true
    yearlyRevenue?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type SubscriptionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Subscription to aggregate.
     */
    where?: SubscriptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Subscriptions to fetch.
     */
    orderBy?: SubscriptionOrderByWithRelationInput | SubscriptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SubscriptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Subscriptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Subscriptions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Subscriptions
    **/
    _count?: true | SubscriptionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: SubscriptionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: SubscriptionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SubscriptionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SubscriptionMaxAggregateInputType
  }

  export type GetSubscriptionAggregateType<T extends SubscriptionAggregateArgs> = {
        [P in keyof T & keyof AggregateSubscription]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSubscription[P]>
      : GetScalarType<T[P], AggregateSubscription[P]>
  }




  export type SubscriptionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SubscriptionWhereInput
    orderBy?: SubscriptionOrderByWithAggregationInput | SubscriptionOrderByWithAggregationInput[]
    by: SubscriptionScalarFieldEnum[] | SubscriptionScalarFieldEnum
    having?: SubscriptionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SubscriptionCountAggregateInputType | true
    _avg?: SubscriptionAvgAggregateInputType
    _sum?: SubscriptionSumAggregateInputType
    _min?: SubscriptionMinAggregateInputType
    _max?: SubscriptionMaxAggregateInputType
  }

  export type SubscriptionGroupByOutputType = {
    id: string
    organizationId: string
    stripeSubscriptionId: string | null
    stripePriceId: string | null
    plan: $Enums.SubscriptionPlan
    status: $Enums.SubscriptionStatus
    currentPeriodStart: Date
    currentPeriodEnd: Date
    trialStart: Date | null
    trialEnd: Date | null
    canceledAt: Date | null
    cancelAtPeriodEnd: boolean
    monthlyRevenue: Decimal | null
    yearlyRevenue: Decimal | null
    createdAt: Date
    updatedAt: Date
    _count: SubscriptionCountAggregateOutputType | null
    _avg: SubscriptionAvgAggregateOutputType | null
    _sum: SubscriptionSumAggregateOutputType | null
    _min: SubscriptionMinAggregateOutputType | null
    _max: SubscriptionMaxAggregateOutputType | null
  }

  type GetSubscriptionGroupByPayload<T extends SubscriptionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SubscriptionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SubscriptionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SubscriptionGroupByOutputType[P]>
            : GetScalarType<T[P], SubscriptionGroupByOutputType[P]>
        }
      >
    >


  export type SubscriptionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    organizationId?: boolean
    stripeSubscriptionId?: boolean
    stripePriceId?: boolean
    plan?: boolean
    status?: boolean
    currentPeriodStart?: boolean
    currentPeriodEnd?: boolean
    trialStart?: boolean
    trialEnd?: boolean
    canceledAt?: boolean
    cancelAtPeriodEnd?: boolean
    monthlyRevenue?: boolean
    yearlyRevenue?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    organization?: boolean | OrganizationDefaultArgs<ExtArgs>
    billingEvents?: boolean | Subscription$billingEventsArgs<ExtArgs>
    _count?: boolean | SubscriptionCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["subscription"]>

  export type SubscriptionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    organizationId?: boolean
    stripeSubscriptionId?: boolean
    stripePriceId?: boolean
    plan?: boolean
    status?: boolean
    currentPeriodStart?: boolean
    currentPeriodEnd?: boolean
    trialStart?: boolean
    trialEnd?: boolean
    canceledAt?: boolean
    cancelAtPeriodEnd?: boolean
    monthlyRevenue?: boolean
    yearlyRevenue?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    organization?: boolean | OrganizationDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["subscription"]>

  export type SubscriptionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    organizationId?: boolean
    stripeSubscriptionId?: boolean
    stripePriceId?: boolean
    plan?: boolean
    status?: boolean
    currentPeriodStart?: boolean
    currentPeriodEnd?: boolean
    trialStart?: boolean
    trialEnd?: boolean
    canceledAt?: boolean
    cancelAtPeriodEnd?: boolean
    monthlyRevenue?: boolean
    yearlyRevenue?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    organization?: boolean | OrganizationDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["subscription"]>

  export type SubscriptionSelectScalar = {
    id?: boolean
    organizationId?: boolean
    stripeSubscriptionId?: boolean
    stripePriceId?: boolean
    plan?: boolean
    status?: boolean
    currentPeriodStart?: boolean
    currentPeriodEnd?: boolean
    trialStart?: boolean
    trialEnd?: boolean
    canceledAt?: boolean
    cancelAtPeriodEnd?: boolean
    monthlyRevenue?: boolean
    yearlyRevenue?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type SubscriptionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "organizationId" | "stripeSubscriptionId" | "stripePriceId" | "plan" | "status" | "currentPeriodStart" | "currentPeriodEnd" | "trialStart" | "trialEnd" | "canceledAt" | "cancelAtPeriodEnd" | "monthlyRevenue" | "yearlyRevenue" | "createdAt" | "updatedAt", ExtArgs["result"]["subscription"]>
  export type SubscriptionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    organization?: boolean | OrganizationDefaultArgs<ExtArgs>
    billingEvents?: boolean | Subscription$billingEventsArgs<ExtArgs>
    _count?: boolean | SubscriptionCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type SubscriptionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    organization?: boolean | OrganizationDefaultArgs<ExtArgs>
  }
  export type SubscriptionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    organization?: boolean | OrganizationDefaultArgs<ExtArgs>
  }

  export type $SubscriptionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Subscription"
    objects: {
      organization: Prisma.$OrganizationPayload<ExtArgs>
      billingEvents: Prisma.$BillingEventPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      organizationId: string
      stripeSubscriptionId: string | null
      stripePriceId: string | null
      plan: $Enums.SubscriptionPlan
      status: $Enums.SubscriptionStatus
      currentPeriodStart: Date
      currentPeriodEnd: Date
      trialStart: Date | null
      trialEnd: Date | null
      canceledAt: Date | null
      cancelAtPeriodEnd: boolean
      monthlyRevenue: Prisma.Decimal | null
      yearlyRevenue: Prisma.Decimal | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["subscription"]>
    composites: {}
  }

  type SubscriptionGetPayload<S extends boolean | null | undefined | SubscriptionDefaultArgs> = $Result.GetResult<Prisma.$SubscriptionPayload, S>

  type SubscriptionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SubscriptionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SubscriptionCountAggregateInputType | true
    }

  export interface SubscriptionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Subscription'], meta: { name: 'Subscription' } }
    /**
     * Find zero or one Subscription that matches the filter.
     * @param {SubscriptionFindUniqueArgs} args - Arguments to find a Subscription
     * @example
     * // Get one Subscription
     * const subscription = await prisma.subscription.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SubscriptionFindUniqueArgs>(args: SelectSubset<T, SubscriptionFindUniqueArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Subscription that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SubscriptionFindUniqueOrThrowArgs} args - Arguments to find a Subscription
     * @example
     * // Get one Subscription
     * const subscription = await prisma.subscription.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SubscriptionFindUniqueOrThrowArgs>(args: SelectSubset<T, SubscriptionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Subscription that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionFindFirstArgs} args - Arguments to find a Subscription
     * @example
     * // Get one Subscription
     * const subscription = await prisma.subscription.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SubscriptionFindFirstArgs>(args?: SelectSubset<T, SubscriptionFindFirstArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Subscription that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionFindFirstOrThrowArgs} args - Arguments to find a Subscription
     * @example
     * // Get one Subscription
     * const subscription = await prisma.subscription.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SubscriptionFindFirstOrThrowArgs>(args?: SelectSubset<T, SubscriptionFindFirstOrThrowArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Subscriptions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Subscriptions
     * const subscriptions = await prisma.subscription.findMany()
     * 
     * // Get first 10 Subscriptions
     * const subscriptions = await prisma.subscription.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const subscriptionWithIdOnly = await prisma.subscription.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SubscriptionFindManyArgs>(args?: SelectSubset<T, SubscriptionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Subscription.
     * @param {SubscriptionCreateArgs} args - Arguments to create a Subscription.
     * @example
     * // Create one Subscription
     * const Subscription = await prisma.subscription.create({
     *   data: {
     *     // ... data to create a Subscription
     *   }
     * })
     * 
     */
    create<T extends SubscriptionCreateArgs>(args: SelectSubset<T, SubscriptionCreateArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Subscriptions.
     * @param {SubscriptionCreateManyArgs} args - Arguments to create many Subscriptions.
     * @example
     * // Create many Subscriptions
     * const subscription = await prisma.subscription.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SubscriptionCreateManyArgs>(args?: SelectSubset<T, SubscriptionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Subscriptions and returns the data saved in the database.
     * @param {SubscriptionCreateManyAndReturnArgs} args - Arguments to create many Subscriptions.
     * @example
     * // Create many Subscriptions
     * const subscription = await prisma.subscription.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Subscriptions and only return the `id`
     * const subscriptionWithIdOnly = await prisma.subscription.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SubscriptionCreateManyAndReturnArgs>(args?: SelectSubset<T, SubscriptionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Subscription.
     * @param {SubscriptionDeleteArgs} args - Arguments to delete one Subscription.
     * @example
     * // Delete one Subscription
     * const Subscription = await prisma.subscription.delete({
     *   where: {
     *     // ... filter to delete one Subscription
     *   }
     * })
     * 
     */
    delete<T extends SubscriptionDeleteArgs>(args: SelectSubset<T, SubscriptionDeleteArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Subscription.
     * @param {SubscriptionUpdateArgs} args - Arguments to update one Subscription.
     * @example
     * // Update one Subscription
     * const subscription = await prisma.subscription.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SubscriptionUpdateArgs>(args: SelectSubset<T, SubscriptionUpdateArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Subscriptions.
     * @param {SubscriptionDeleteManyArgs} args - Arguments to filter Subscriptions to delete.
     * @example
     * // Delete a few Subscriptions
     * const { count } = await prisma.subscription.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SubscriptionDeleteManyArgs>(args?: SelectSubset<T, SubscriptionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Subscriptions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Subscriptions
     * const subscription = await prisma.subscription.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SubscriptionUpdateManyArgs>(args: SelectSubset<T, SubscriptionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Subscriptions and returns the data updated in the database.
     * @param {SubscriptionUpdateManyAndReturnArgs} args - Arguments to update many Subscriptions.
     * @example
     * // Update many Subscriptions
     * const subscription = await prisma.subscription.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Subscriptions and only return the `id`
     * const subscriptionWithIdOnly = await prisma.subscription.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends SubscriptionUpdateManyAndReturnArgs>(args: SelectSubset<T, SubscriptionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Subscription.
     * @param {SubscriptionUpsertArgs} args - Arguments to update or create a Subscription.
     * @example
     * // Update or create a Subscription
     * const subscription = await prisma.subscription.upsert({
     *   create: {
     *     // ... data to create a Subscription
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Subscription we want to update
     *   }
     * })
     */
    upsert<T extends SubscriptionUpsertArgs>(args: SelectSubset<T, SubscriptionUpsertArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Subscriptions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionCountArgs} args - Arguments to filter Subscriptions to count.
     * @example
     * // Count the number of Subscriptions
     * const count = await prisma.subscription.count({
     *   where: {
     *     // ... the filter for the Subscriptions we want to count
     *   }
     * })
    **/
    count<T extends SubscriptionCountArgs>(
      args?: Subset<T, SubscriptionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SubscriptionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Subscription.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SubscriptionAggregateArgs>(args: Subset<T, SubscriptionAggregateArgs>): Prisma.PrismaPromise<GetSubscriptionAggregateType<T>>

    /**
     * Group by Subscription.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SubscriptionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SubscriptionGroupByArgs['orderBy'] }
        : { orderBy?: SubscriptionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SubscriptionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSubscriptionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Subscription model
   */
  readonly fields: SubscriptionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Subscription.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SubscriptionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    organization<T extends OrganizationDefaultArgs<ExtArgs> = {}>(args?: Subset<T, OrganizationDefaultArgs<ExtArgs>>): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    billingEvents<T extends Subscription$billingEventsArgs<ExtArgs> = {}>(args?: Subset<T, Subscription$billingEventsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BillingEventPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Subscription model
   */
  interface SubscriptionFieldRefs {
    readonly id: FieldRef<"Subscription", 'String'>
    readonly organizationId: FieldRef<"Subscription", 'String'>
    readonly stripeSubscriptionId: FieldRef<"Subscription", 'String'>
    readonly stripePriceId: FieldRef<"Subscription", 'String'>
    readonly plan: FieldRef<"Subscription", 'SubscriptionPlan'>
    readonly status: FieldRef<"Subscription", 'SubscriptionStatus'>
    readonly currentPeriodStart: FieldRef<"Subscription", 'DateTime'>
    readonly currentPeriodEnd: FieldRef<"Subscription", 'DateTime'>
    readonly trialStart: FieldRef<"Subscription", 'DateTime'>
    readonly trialEnd: FieldRef<"Subscription", 'DateTime'>
    readonly canceledAt: FieldRef<"Subscription", 'DateTime'>
    readonly cancelAtPeriodEnd: FieldRef<"Subscription", 'Boolean'>
    readonly monthlyRevenue: FieldRef<"Subscription", 'Decimal'>
    readonly yearlyRevenue: FieldRef<"Subscription", 'Decimal'>
    readonly createdAt: FieldRef<"Subscription", 'DateTime'>
    readonly updatedAt: FieldRef<"Subscription", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Subscription findUnique
   */
  export type SubscriptionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * Filter, which Subscription to fetch.
     */
    where: SubscriptionWhereUniqueInput
  }

  /**
   * Subscription findUniqueOrThrow
   */
  export type SubscriptionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * Filter, which Subscription to fetch.
     */
    where: SubscriptionWhereUniqueInput
  }

  /**
   * Subscription findFirst
   */
  export type SubscriptionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * Filter, which Subscription to fetch.
     */
    where?: SubscriptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Subscriptions to fetch.
     */
    orderBy?: SubscriptionOrderByWithRelationInput | SubscriptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Subscriptions.
     */
    cursor?: SubscriptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Subscriptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Subscriptions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Subscriptions.
     */
    distinct?: SubscriptionScalarFieldEnum | SubscriptionScalarFieldEnum[]
  }

  /**
   * Subscription findFirstOrThrow
   */
  export type SubscriptionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * Filter, which Subscription to fetch.
     */
    where?: SubscriptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Subscriptions to fetch.
     */
    orderBy?: SubscriptionOrderByWithRelationInput | SubscriptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Subscriptions.
     */
    cursor?: SubscriptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Subscriptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Subscriptions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Subscriptions.
     */
    distinct?: SubscriptionScalarFieldEnum | SubscriptionScalarFieldEnum[]
  }

  /**
   * Subscription findMany
   */
  export type SubscriptionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * Filter, which Subscriptions to fetch.
     */
    where?: SubscriptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Subscriptions to fetch.
     */
    orderBy?: SubscriptionOrderByWithRelationInput | SubscriptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Subscriptions.
     */
    cursor?: SubscriptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Subscriptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Subscriptions.
     */
    skip?: number
    distinct?: SubscriptionScalarFieldEnum | SubscriptionScalarFieldEnum[]
  }

  /**
   * Subscription create
   */
  export type SubscriptionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * The data needed to create a Subscription.
     */
    data: XOR<SubscriptionCreateInput, SubscriptionUncheckedCreateInput>
  }

  /**
   * Subscription createMany
   */
  export type SubscriptionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Subscriptions.
     */
    data: SubscriptionCreateManyInput | SubscriptionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Subscription createManyAndReturn
   */
  export type SubscriptionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * The data used to create many Subscriptions.
     */
    data: SubscriptionCreateManyInput | SubscriptionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Subscription update
   */
  export type SubscriptionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * The data needed to update a Subscription.
     */
    data: XOR<SubscriptionUpdateInput, SubscriptionUncheckedUpdateInput>
    /**
     * Choose, which Subscription to update.
     */
    where: SubscriptionWhereUniqueInput
  }

  /**
   * Subscription updateMany
   */
  export type SubscriptionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Subscriptions.
     */
    data: XOR<SubscriptionUpdateManyMutationInput, SubscriptionUncheckedUpdateManyInput>
    /**
     * Filter which Subscriptions to update
     */
    where?: SubscriptionWhereInput
    /**
     * Limit how many Subscriptions to update.
     */
    limit?: number
  }

  /**
   * Subscription updateManyAndReturn
   */
  export type SubscriptionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * The data used to update Subscriptions.
     */
    data: XOR<SubscriptionUpdateManyMutationInput, SubscriptionUncheckedUpdateManyInput>
    /**
     * Filter which Subscriptions to update
     */
    where?: SubscriptionWhereInput
    /**
     * Limit how many Subscriptions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Subscription upsert
   */
  export type SubscriptionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * The filter to search for the Subscription to update in case it exists.
     */
    where: SubscriptionWhereUniqueInput
    /**
     * In case the Subscription found by the `where` argument doesn't exist, create a new Subscription with this data.
     */
    create: XOR<SubscriptionCreateInput, SubscriptionUncheckedCreateInput>
    /**
     * In case the Subscription was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SubscriptionUpdateInput, SubscriptionUncheckedUpdateInput>
  }

  /**
   * Subscription delete
   */
  export type SubscriptionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * Filter which Subscription to delete.
     */
    where: SubscriptionWhereUniqueInput
  }

  /**
   * Subscription deleteMany
   */
  export type SubscriptionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Subscriptions to delete
     */
    where?: SubscriptionWhereInput
    /**
     * Limit how many Subscriptions to delete.
     */
    limit?: number
  }

  /**
   * Subscription.billingEvents
   */
  export type Subscription$billingEventsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BillingEvent
     */
    select?: BillingEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BillingEvent
     */
    omit?: BillingEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BillingEventInclude<ExtArgs> | null
    where?: BillingEventWhereInput
    orderBy?: BillingEventOrderByWithRelationInput | BillingEventOrderByWithRelationInput[]
    cursor?: BillingEventWhereUniqueInput
    take?: number
    skip?: number
    distinct?: BillingEventScalarFieldEnum | BillingEventScalarFieldEnum[]
  }

  /**
   * Subscription without action
   */
  export type SubscriptionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
  }


  /**
   * Model BillingEvent
   */

  export type AggregateBillingEvent = {
    _count: BillingEventCountAggregateOutputType | null
    _avg: BillingEventAvgAggregateOutputType | null
    _sum: BillingEventSumAggregateOutputType | null
    _min: BillingEventMinAggregateOutputType | null
    _max: BillingEventMaxAggregateOutputType | null
  }

  export type BillingEventAvgAggregateOutputType = {
    amount: Decimal | null
  }

  export type BillingEventSumAggregateOutputType = {
    amount: Decimal | null
  }

  export type BillingEventMinAggregateOutputType = {
    id: string | null
    organizationId: string | null
    subscriptionId: string | null
    stripeEventId: string | null
    eventType: $Enums.BillingEventType | null
    amount: Decimal | null
    currency: string | null
    description: string | null
    processedAt: Date | null
    createdAt: Date | null
  }

  export type BillingEventMaxAggregateOutputType = {
    id: string | null
    organizationId: string | null
    subscriptionId: string | null
    stripeEventId: string | null
    eventType: $Enums.BillingEventType | null
    amount: Decimal | null
    currency: string | null
    description: string | null
    processedAt: Date | null
    createdAt: Date | null
  }

  export type BillingEventCountAggregateOutputType = {
    id: number
    organizationId: number
    subscriptionId: number
    stripeEventId: number
    eventType: number
    amount: number
    currency: number
    description: number
    metadata: number
    processedAt: number
    createdAt: number
    _all: number
  }


  export type BillingEventAvgAggregateInputType = {
    amount?: true
  }

  export type BillingEventSumAggregateInputType = {
    amount?: true
  }

  export type BillingEventMinAggregateInputType = {
    id?: true
    organizationId?: true
    subscriptionId?: true
    stripeEventId?: true
    eventType?: true
    amount?: true
    currency?: true
    description?: true
    processedAt?: true
    createdAt?: true
  }

  export type BillingEventMaxAggregateInputType = {
    id?: true
    organizationId?: true
    subscriptionId?: true
    stripeEventId?: true
    eventType?: true
    amount?: true
    currency?: true
    description?: true
    processedAt?: true
    createdAt?: true
  }

  export type BillingEventCountAggregateInputType = {
    id?: true
    organizationId?: true
    subscriptionId?: true
    stripeEventId?: true
    eventType?: true
    amount?: true
    currency?: true
    description?: true
    metadata?: true
    processedAt?: true
    createdAt?: true
    _all?: true
  }

  export type BillingEventAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which BillingEvent to aggregate.
     */
    where?: BillingEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BillingEvents to fetch.
     */
    orderBy?: BillingEventOrderByWithRelationInput | BillingEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: BillingEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BillingEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BillingEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned BillingEvents
    **/
    _count?: true | BillingEventCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: BillingEventAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: BillingEventSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: BillingEventMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: BillingEventMaxAggregateInputType
  }

  export type GetBillingEventAggregateType<T extends BillingEventAggregateArgs> = {
        [P in keyof T & keyof AggregateBillingEvent]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateBillingEvent[P]>
      : GetScalarType<T[P], AggregateBillingEvent[P]>
  }




  export type BillingEventGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: BillingEventWhereInput
    orderBy?: BillingEventOrderByWithAggregationInput | BillingEventOrderByWithAggregationInput[]
    by: BillingEventScalarFieldEnum[] | BillingEventScalarFieldEnum
    having?: BillingEventScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: BillingEventCountAggregateInputType | true
    _avg?: BillingEventAvgAggregateInputType
    _sum?: BillingEventSumAggregateInputType
    _min?: BillingEventMinAggregateInputType
    _max?: BillingEventMaxAggregateInputType
  }

  export type BillingEventGroupByOutputType = {
    id: string
    organizationId: string
    subscriptionId: string | null
    stripeEventId: string | null
    eventType: $Enums.BillingEventType
    amount: Decimal | null
    currency: string | null
    description: string | null
    metadata: JsonValue | null
    processedAt: Date | null
    createdAt: Date
    _count: BillingEventCountAggregateOutputType | null
    _avg: BillingEventAvgAggregateOutputType | null
    _sum: BillingEventSumAggregateOutputType | null
    _min: BillingEventMinAggregateOutputType | null
    _max: BillingEventMaxAggregateOutputType | null
  }

  type GetBillingEventGroupByPayload<T extends BillingEventGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<BillingEventGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof BillingEventGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], BillingEventGroupByOutputType[P]>
            : GetScalarType<T[P], BillingEventGroupByOutputType[P]>
        }
      >
    >


  export type BillingEventSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    organizationId?: boolean
    subscriptionId?: boolean
    stripeEventId?: boolean
    eventType?: boolean
    amount?: boolean
    currency?: boolean
    description?: boolean
    metadata?: boolean
    processedAt?: boolean
    createdAt?: boolean
    organization?: boolean | OrganizationDefaultArgs<ExtArgs>
    subscription?: boolean | BillingEvent$subscriptionArgs<ExtArgs>
  }, ExtArgs["result"]["billingEvent"]>

  export type BillingEventSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    organizationId?: boolean
    subscriptionId?: boolean
    stripeEventId?: boolean
    eventType?: boolean
    amount?: boolean
    currency?: boolean
    description?: boolean
    metadata?: boolean
    processedAt?: boolean
    createdAt?: boolean
    organization?: boolean | OrganizationDefaultArgs<ExtArgs>
    subscription?: boolean | BillingEvent$subscriptionArgs<ExtArgs>
  }, ExtArgs["result"]["billingEvent"]>

  export type BillingEventSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    organizationId?: boolean
    subscriptionId?: boolean
    stripeEventId?: boolean
    eventType?: boolean
    amount?: boolean
    currency?: boolean
    description?: boolean
    metadata?: boolean
    processedAt?: boolean
    createdAt?: boolean
    organization?: boolean | OrganizationDefaultArgs<ExtArgs>
    subscription?: boolean | BillingEvent$subscriptionArgs<ExtArgs>
  }, ExtArgs["result"]["billingEvent"]>

  export type BillingEventSelectScalar = {
    id?: boolean
    organizationId?: boolean
    subscriptionId?: boolean
    stripeEventId?: boolean
    eventType?: boolean
    amount?: boolean
    currency?: boolean
    description?: boolean
    metadata?: boolean
    processedAt?: boolean
    createdAt?: boolean
  }

  export type BillingEventOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "organizationId" | "subscriptionId" | "stripeEventId" | "eventType" | "amount" | "currency" | "description" | "metadata" | "processedAt" | "createdAt", ExtArgs["result"]["billingEvent"]>
  export type BillingEventInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    organization?: boolean | OrganizationDefaultArgs<ExtArgs>
    subscription?: boolean | BillingEvent$subscriptionArgs<ExtArgs>
  }
  export type BillingEventIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    organization?: boolean | OrganizationDefaultArgs<ExtArgs>
    subscription?: boolean | BillingEvent$subscriptionArgs<ExtArgs>
  }
  export type BillingEventIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    organization?: boolean | OrganizationDefaultArgs<ExtArgs>
    subscription?: boolean | BillingEvent$subscriptionArgs<ExtArgs>
  }

  export type $BillingEventPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "BillingEvent"
    objects: {
      organization: Prisma.$OrganizationPayload<ExtArgs>
      subscription: Prisma.$SubscriptionPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      organizationId: string
      subscriptionId: string | null
      stripeEventId: string | null
      eventType: $Enums.BillingEventType
      amount: Prisma.Decimal | null
      currency: string | null
      description: string | null
      metadata: Prisma.JsonValue | null
      processedAt: Date | null
      createdAt: Date
    }, ExtArgs["result"]["billingEvent"]>
    composites: {}
  }

  type BillingEventGetPayload<S extends boolean | null | undefined | BillingEventDefaultArgs> = $Result.GetResult<Prisma.$BillingEventPayload, S>

  type BillingEventCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<BillingEventFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: BillingEventCountAggregateInputType | true
    }

  export interface BillingEventDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['BillingEvent'], meta: { name: 'BillingEvent' } }
    /**
     * Find zero or one BillingEvent that matches the filter.
     * @param {BillingEventFindUniqueArgs} args - Arguments to find a BillingEvent
     * @example
     * // Get one BillingEvent
     * const billingEvent = await prisma.billingEvent.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends BillingEventFindUniqueArgs>(args: SelectSubset<T, BillingEventFindUniqueArgs<ExtArgs>>): Prisma__BillingEventClient<$Result.GetResult<Prisma.$BillingEventPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one BillingEvent that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {BillingEventFindUniqueOrThrowArgs} args - Arguments to find a BillingEvent
     * @example
     * // Get one BillingEvent
     * const billingEvent = await prisma.billingEvent.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends BillingEventFindUniqueOrThrowArgs>(args: SelectSubset<T, BillingEventFindUniqueOrThrowArgs<ExtArgs>>): Prisma__BillingEventClient<$Result.GetResult<Prisma.$BillingEventPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first BillingEvent that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BillingEventFindFirstArgs} args - Arguments to find a BillingEvent
     * @example
     * // Get one BillingEvent
     * const billingEvent = await prisma.billingEvent.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends BillingEventFindFirstArgs>(args?: SelectSubset<T, BillingEventFindFirstArgs<ExtArgs>>): Prisma__BillingEventClient<$Result.GetResult<Prisma.$BillingEventPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first BillingEvent that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BillingEventFindFirstOrThrowArgs} args - Arguments to find a BillingEvent
     * @example
     * // Get one BillingEvent
     * const billingEvent = await prisma.billingEvent.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends BillingEventFindFirstOrThrowArgs>(args?: SelectSubset<T, BillingEventFindFirstOrThrowArgs<ExtArgs>>): Prisma__BillingEventClient<$Result.GetResult<Prisma.$BillingEventPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more BillingEvents that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BillingEventFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all BillingEvents
     * const billingEvents = await prisma.billingEvent.findMany()
     * 
     * // Get first 10 BillingEvents
     * const billingEvents = await prisma.billingEvent.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const billingEventWithIdOnly = await prisma.billingEvent.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends BillingEventFindManyArgs>(args?: SelectSubset<T, BillingEventFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BillingEventPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a BillingEvent.
     * @param {BillingEventCreateArgs} args - Arguments to create a BillingEvent.
     * @example
     * // Create one BillingEvent
     * const BillingEvent = await prisma.billingEvent.create({
     *   data: {
     *     // ... data to create a BillingEvent
     *   }
     * })
     * 
     */
    create<T extends BillingEventCreateArgs>(args: SelectSubset<T, BillingEventCreateArgs<ExtArgs>>): Prisma__BillingEventClient<$Result.GetResult<Prisma.$BillingEventPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many BillingEvents.
     * @param {BillingEventCreateManyArgs} args - Arguments to create many BillingEvents.
     * @example
     * // Create many BillingEvents
     * const billingEvent = await prisma.billingEvent.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends BillingEventCreateManyArgs>(args?: SelectSubset<T, BillingEventCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many BillingEvents and returns the data saved in the database.
     * @param {BillingEventCreateManyAndReturnArgs} args - Arguments to create many BillingEvents.
     * @example
     * // Create many BillingEvents
     * const billingEvent = await prisma.billingEvent.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many BillingEvents and only return the `id`
     * const billingEventWithIdOnly = await prisma.billingEvent.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends BillingEventCreateManyAndReturnArgs>(args?: SelectSubset<T, BillingEventCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BillingEventPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a BillingEvent.
     * @param {BillingEventDeleteArgs} args - Arguments to delete one BillingEvent.
     * @example
     * // Delete one BillingEvent
     * const BillingEvent = await prisma.billingEvent.delete({
     *   where: {
     *     // ... filter to delete one BillingEvent
     *   }
     * })
     * 
     */
    delete<T extends BillingEventDeleteArgs>(args: SelectSubset<T, BillingEventDeleteArgs<ExtArgs>>): Prisma__BillingEventClient<$Result.GetResult<Prisma.$BillingEventPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one BillingEvent.
     * @param {BillingEventUpdateArgs} args - Arguments to update one BillingEvent.
     * @example
     * // Update one BillingEvent
     * const billingEvent = await prisma.billingEvent.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends BillingEventUpdateArgs>(args: SelectSubset<T, BillingEventUpdateArgs<ExtArgs>>): Prisma__BillingEventClient<$Result.GetResult<Prisma.$BillingEventPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more BillingEvents.
     * @param {BillingEventDeleteManyArgs} args - Arguments to filter BillingEvents to delete.
     * @example
     * // Delete a few BillingEvents
     * const { count } = await prisma.billingEvent.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends BillingEventDeleteManyArgs>(args?: SelectSubset<T, BillingEventDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more BillingEvents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BillingEventUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many BillingEvents
     * const billingEvent = await prisma.billingEvent.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends BillingEventUpdateManyArgs>(args: SelectSubset<T, BillingEventUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more BillingEvents and returns the data updated in the database.
     * @param {BillingEventUpdateManyAndReturnArgs} args - Arguments to update many BillingEvents.
     * @example
     * // Update many BillingEvents
     * const billingEvent = await prisma.billingEvent.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more BillingEvents and only return the `id`
     * const billingEventWithIdOnly = await prisma.billingEvent.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends BillingEventUpdateManyAndReturnArgs>(args: SelectSubset<T, BillingEventUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BillingEventPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one BillingEvent.
     * @param {BillingEventUpsertArgs} args - Arguments to update or create a BillingEvent.
     * @example
     * // Update or create a BillingEvent
     * const billingEvent = await prisma.billingEvent.upsert({
     *   create: {
     *     // ... data to create a BillingEvent
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the BillingEvent we want to update
     *   }
     * })
     */
    upsert<T extends BillingEventUpsertArgs>(args: SelectSubset<T, BillingEventUpsertArgs<ExtArgs>>): Prisma__BillingEventClient<$Result.GetResult<Prisma.$BillingEventPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of BillingEvents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BillingEventCountArgs} args - Arguments to filter BillingEvents to count.
     * @example
     * // Count the number of BillingEvents
     * const count = await prisma.billingEvent.count({
     *   where: {
     *     // ... the filter for the BillingEvents we want to count
     *   }
     * })
    **/
    count<T extends BillingEventCountArgs>(
      args?: Subset<T, BillingEventCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], BillingEventCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a BillingEvent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BillingEventAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends BillingEventAggregateArgs>(args: Subset<T, BillingEventAggregateArgs>): Prisma.PrismaPromise<GetBillingEventAggregateType<T>>

    /**
     * Group by BillingEvent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BillingEventGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends BillingEventGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: BillingEventGroupByArgs['orderBy'] }
        : { orderBy?: BillingEventGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, BillingEventGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetBillingEventGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the BillingEvent model
   */
  readonly fields: BillingEventFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for BillingEvent.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__BillingEventClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    organization<T extends OrganizationDefaultArgs<ExtArgs> = {}>(args?: Subset<T, OrganizationDefaultArgs<ExtArgs>>): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    subscription<T extends BillingEvent$subscriptionArgs<ExtArgs> = {}>(args?: Subset<T, BillingEvent$subscriptionArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the BillingEvent model
   */
  interface BillingEventFieldRefs {
    readonly id: FieldRef<"BillingEvent", 'String'>
    readonly organizationId: FieldRef<"BillingEvent", 'String'>
    readonly subscriptionId: FieldRef<"BillingEvent", 'String'>
    readonly stripeEventId: FieldRef<"BillingEvent", 'String'>
    readonly eventType: FieldRef<"BillingEvent", 'BillingEventType'>
    readonly amount: FieldRef<"BillingEvent", 'Decimal'>
    readonly currency: FieldRef<"BillingEvent", 'String'>
    readonly description: FieldRef<"BillingEvent", 'String'>
    readonly metadata: FieldRef<"BillingEvent", 'Json'>
    readonly processedAt: FieldRef<"BillingEvent", 'DateTime'>
    readonly createdAt: FieldRef<"BillingEvent", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * BillingEvent findUnique
   */
  export type BillingEventFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BillingEvent
     */
    select?: BillingEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BillingEvent
     */
    omit?: BillingEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BillingEventInclude<ExtArgs> | null
    /**
     * Filter, which BillingEvent to fetch.
     */
    where: BillingEventWhereUniqueInput
  }

  /**
   * BillingEvent findUniqueOrThrow
   */
  export type BillingEventFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BillingEvent
     */
    select?: BillingEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BillingEvent
     */
    omit?: BillingEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BillingEventInclude<ExtArgs> | null
    /**
     * Filter, which BillingEvent to fetch.
     */
    where: BillingEventWhereUniqueInput
  }

  /**
   * BillingEvent findFirst
   */
  export type BillingEventFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BillingEvent
     */
    select?: BillingEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BillingEvent
     */
    omit?: BillingEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BillingEventInclude<ExtArgs> | null
    /**
     * Filter, which BillingEvent to fetch.
     */
    where?: BillingEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BillingEvents to fetch.
     */
    orderBy?: BillingEventOrderByWithRelationInput | BillingEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for BillingEvents.
     */
    cursor?: BillingEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BillingEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BillingEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of BillingEvents.
     */
    distinct?: BillingEventScalarFieldEnum | BillingEventScalarFieldEnum[]
  }

  /**
   * BillingEvent findFirstOrThrow
   */
  export type BillingEventFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BillingEvent
     */
    select?: BillingEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BillingEvent
     */
    omit?: BillingEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BillingEventInclude<ExtArgs> | null
    /**
     * Filter, which BillingEvent to fetch.
     */
    where?: BillingEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BillingEvents to fetch.
     */
    orderBy?: BillingEventOrderByWithRelationInput | BillingEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for BillingEvents.
     */
    cursor?: BillingEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BillingEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BillingEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of BillingEvents.
     */
    distinct?: BillingEventScalarFieldEnum | BillingEventScalarFieldEnum[]
  }

  /**
   * BillingEvent findMany
   */
  export type BillingEventFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BillingEvent
     */
    select?: BillingEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BillingEvent
     */
    omit?: BillingEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BillingEventInclude<ExtArgs> | null
    /**
     * Filter, which BillingEvents to fetch.
     */
    where?: BillingEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BillingEvents to fetch.
     */
    orderBy?: BillingEventOrderByWithRelationInput | BillingEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing BillingEvents.
     */
    cursor?: BillingEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BillingEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BillingEvents.
     */
    skip?: number
    distinct?: BillingEventScalarFieldEnum | BillingEventScalarFieldEnum[]
  }

  /**
   * BillingEvent create
   */
  export type BillingEventCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BillingEvent
     */
    select?: BillingEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BillingEvent
     */
    omit?: BillingEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BillingEventInclude<ExtArgs> | null
    /**
     * The data needed to create a BillingEvent.
     */
    data: XOR<BillingEventCreateInput, BillingEventUncheckedCreateInput>
  }

  /**
   * BillingEvent createMany
   */
  export type BillingEventCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many BillingEvents.
     */
    data: BillingEventCreateManyInput | BillingEventCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * BillingEvent createManyAndReturn
   */
  export type BillingEventCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BillingEvent
     */
    select?: BillingEventSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the BillingEvent
     */
    omit?: BillingEventOmit<ExtArgs> | null
    /**
     * The data used to create many BillingEvents.
     */
    data: BillingEventCreateManyInput | BillingEventCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BillingEventIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * BillingEvent update
   */
  export type BillingEventUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BillingEvent
     */
    select?: BillingEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BillingEvent
     */
    omit?: BillingEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BillingEventInclude<ExtArgs> | null
    /**
     * The data needed to update a BillingEvent.
     */
    data: XOR<BillingEventUpdateInput, BillingEventUncheckedUpdateInput>
    /**
     * Choose, which BillingEvent to update.
     */
    where: BillingEventWhereUniqueInput
  }

  /**
   * BillingEvent updateMany
   */
  export type BillingEventUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update BillingEvents.
     */
    data: XOR<BillingEventUpdateManyMutationInput, BillingEventUncheckedUpdateManyInput>
    /**
     * Filter which BillingEvents to update
     */
    where?: BillingEventWhereInput
    /**
     * Limit how many BillingEvents to update.
     */
    limit?: number
  }

  /**
   * BillingEvent updateManyAndReturn
   */
  export type BillingEventUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BillingEvent
     */
    select?: BillingEventSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the BillingEvent
     */
    omit?: BillingEventOmit<ExtArgs> | null
    /**
     * The data used to update BillingEvents.
     */
    data: XOR<BillingEventUpdateManyMutationInput, BillingEventUncheckedUpdateManyInput>
    /**
     * Filter which BillingEvents to update
     */
    where?: BillingEventWhereInput
    /**
     * Limit how many BillingEvents to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BillingEventIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * BillingEvent upsert
   */
  export type BillingEventUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BillingEvent
     */
    select?: BillingEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BillingEvent
     */
    omit?: BillingEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BillingEventInclude<ExtArgs> | null
    /**
     * The filter to search for the BillingEvent to update in case it exists.
     */
    where: BillingEventWhereUniqueInput
    /**
     * In case the BillingEvent found by the `where` argument doesn't exist, create a new BillingEvent with this data.
     */
    create: XOR<BillingEventCreateInput, BillingEventUncheckedCreateInput>
    /**
     * In case the BillingEvent was found with the provided `where` argument, update it with this data.
     */
    update: XOR<BillingEventUpdateInput, BillingEventUncheckedUpdateInput>
  }

  /**
   * BillingEvent delete
   */
  export type BillingEventDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BillingEvent
     */
    select?: BillingEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BillingEvent
     */
    omit?: BillingEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BillingEventInclude<ExtArgs> | null
    /**
     * Filter which BillingEvent to delete.
     */
    where: BillingEventWhereUniqueInput
  }

  /**
   * BillingEvent deleteMany
   */
  export type BillingEventDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which BillingEvents to delete
     */
    where?: BillingEventWhereInput
    /**
     * Limit how many BillingEvents to delete.
     */
    limit?: number
  }

  /**
   * BillingEvent.subscription
   */
  export type BillingEvent$subscriptionArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    where?: SubscriptionWhereInput
  }

  /**
   * BillingEvent without action
   */
  export type BillingEventDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BillingEvent
     */
    select?: BillingEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BillingEvent
     */
    omit?: BillingEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BillingEventInclude<ExtArgs> | null
  }


  /**
   * Model RevenueMetric
   */

  export type AggregateRevenueMetric = {
    _count: RevenueMetricCountAggregateOutputType | null
    _avg: RevenueMetricAvgAggregateOutputType | null
    _sum: RevenueMetricSumAggregateOutputType | null
    _min: RevenueMetricMinAggregateOutputType | null
    _max: RevenueMetricMaxAggregateOutputType | null
  }

  export type RevenueMetricAvgAggregateOutputType = {
    totalRevenue: Decimal | null
    newRevenue: Decimal | null
    churnedRevenue: Decimal | null
    upgradeRevenue: Decimal | null
    downgradeRevenue: Decimal | null
    activeSubscriptions: number | null
    trialSubscriptions: number | null
    churnedSubscriptions: number | null
    newSubscriptions: number | null
    churnRate: Decimal | null
    growthRate: Decimal | null
  }

  export type RevenueMetricSumAggregateOutputType = {
    totalRevenue: Decimal | null
    newRevenue: Decimal | null
    churnedRevenue: Decimal | null
    upgradeRevenue: Decimal | null
    downgradeRevenue: Decimal | null
    activeSubscriptions: number | null
    trialSubscriptions: number | null
    churnedSubscriptions: number | null
    newSubscriptions: number | null
    churnRate: Decimal | null
    growthRate: Decimal | null
  }

  export type RevenueMetricMinAggregateOutputType = {
    id: string | null
    date: Date | null
    period: $Enums.MetricPeriod | null
    totalRevenue: Decimal | null
    newRevenue: Decimal | null
    churnedRevenue: Decimal | null
    upgradeRevenue: Decimal | null
    downgradeRevenue: Decimal | null
    activeSubscriptions: number | null
    trialSubscriptions: number | null
    churnedSubscriptions: number | null
    newSubscriptions: number | null
    churnRate: Decimal | null
    growthRate: Decimal | null
    createdAt: Date | null
  }

  export type RevenueMetricMaxAggregateOutputType = {
    id: string | null
    date: Date | null
    period: $Enums.MetricPeriod | null
    totalRevenue: Decimal | null
    newRevenue: Decimal | null
    churnedRevenue: Decimal | null
    upgradeRevenue: Decimal | null
    downgradeRevenue: Decimal | null
    activeSubscriptions: number | null
    trialSubscriptions: number | null
    churnedSubscriptions: number | null
    newSubscriptions: number | null
    churnRate: Decimal | null
    growthRate: Decimal | null
    createdAt: Date | null
  }

  export type RevenueMetricCountAggregateOutputType = {
    id: number
    date: number
    period: number
    totalRevenue: number
    newRevenue: number
    churnedRevenue: number
    upgradeRevenue: number
    downgradeRevenue: number
    activeSubscriptions: number
    trialSubscriptions: number
    churnedSubscriptions: number
    newSubscriptions: number
    churnRate: number
    growthRate: number
    createdAt: number
    _all: number
  }


  export type RevenueMetricAvgAggregateInputType = {
    totalRevenue?: true
    newRevenue?: true
    churnedRevenue?: true
    upgradeRevenue?: true
    downgradeRevenue?: true
    activeSubscriptions?: true
    trialSubscriptions?: true
    churnedSubscriptions?: true
    newSubscriptions?: true
    churnRate?: true
    growthRate?: true
  }

  export type RevenueMetricSumAggregateInputType = {
    totalRevenue?: true
    newRevenue?: true
    churnedRevenue?: true
    upgradeRevenue?: true
    downgradeRevenue?: true
    activeSubscriptions?: true
    trialSubscriptions?: true
    churnedSubscriptions?: true
    newSubscriptions?: true
    churnRate?: true
    growthRate?: true
  }

  export type RevenueMetricMinAggregateInputType = {
    id?: true
    date?: true
    period?: true
    totalRevenue?: true
    newRevenue?: true
    churnedRevenue?: true
    upgradeRevenue?: true
    downgradeRevenue?: true
    activeSubscriptions?: true
    trialSubscriptions?: true
    churnedSubscriptions?: true
    newSubscriptions?: true
    churnRate?: true
    growthRate?: true
    createdAt?: true
  }

  export type RevenueMetricMaxAggregateInputType = {
    id?: true
    date?: true
    period?: true
    totalRevenue?: true
    newRevenue?: true
    churnedRevenue?: true
    upgradeRevenue?: true
    downgradeRevenue?: true
    activeSubscriptions?: true
    trialSubscriptions?: true
    churnedSubscriptions?: true
    newSubscriptions?: true
    churnRate?: true
    growthRate?: true
    createdAt?: true
  }

  export type RevenueMetricCountAggregateInputType = {
    id?: true
    date?: true
    period?: true
    totalRevenue?: true
    newRevenue?: true
    churnedRevenue?: true
    upgradeRevenue?: true
    downgradeRevenue?: true
    activeSubscriptions?: true
    trialSubscriptions?: true
    churnedSubscriptions?: true
    newSubscriptions?: true
    churnRate?: true
    growthRate?: true
    createdAt?: true
    _all?: true
  }

  export type RevenueMetricAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RevenueMetric to aggregate.
     */
    where?: RevenueMetricWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RevenueMetrics to fetch.
     */
    orderBy?: RevenueMetricOrderByWithRelationInput | RevenueMetricOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RevenueMetricWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RevenueMetrics from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RevenueMetrics.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned RevenueMetrics
    **/
    _count?: true | RevenueMetricCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: RevenueMetricAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: RevenueMetricSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RevenueMetricMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RevenueMetricMaxAggregateInputType
  }

  export type GetRevenueMetricAggregateType<T extends RevenueMetricAggregateArgs> = {
        [P in keyof T & keyof AggregateRevenueMetric]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRevenueMetric[P]>
      : GetScalarType<T[P], AggregateRevenueMetric[P]>
  }




  export type RevenueMetricGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RevenueMetricWhereInput
    orderBy?: RevenueMetricOrderByWithAggregationInput | RevenueMetricOrderByWithAggregationInput[]
    by: RevenueMetricScalarFieldEnum[] | RevenueMetricScalarFieldEnum
    having?: RevenueMetricScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RevenueMetricCountAggregateInputType | true
    _avg?: RevenueMetricAvgAggregateInputType
    _sum?: RevenueMetricSumAggregateInputType
    _min?: RevenueMetricMinAggregateInputType
    _max?: RevenueMetricMaxAggregateInputType
  }

  export type RevenueMetricGroupByOutputType = {
    id: string
    date: Date
    period: $Enums.MetricPeriod
    totalRevenue: Decimal
    newRevenue: Decimal
    churnedRevenue: Decimal
    upgradeRevenue: Decimal
    downgradeRevenue: Decimal
    activeSubscriptions: number
    trialSubscriptions: number
    churnedSubscriptions: number
    newSubscriptions: number
    churnRate: Decimal | null
    growthRate: Decimal | null
    createdAt: Date
    _count: RevenueMetricCountAggregateOutputType | null
    _avg: RevenueMetricAvgAggregateOutputType | null
    _sum: RevenueMetricSumAggregateOutputType | null
    _min: RevenueMetricMinAggregateOutputType | null
    _max: RevenueMetricMaxAggregateOutputType | null
  }

  type GetRevenueMetricGroupByPayload<T extends RevenueMetricGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RevenueMetricGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RevenueMetricGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RevenueMetricGroupByOutputType[P]>
            : GetScalarType<T[P], RevenueMetricGroupByOutputType[P]>
        }
      >
    >


  export type RevenueMetricSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    date?: boolean
    period?: boolean
    totalRevenue?: boolean
    newRevenue?: boolean
    churnedRevenue?: boolean
    upgradeRevenue?: boolean
    downgradeRevenue?: boolean
    activeSubscriptions?: boolean
    trialSubscriptions?: boolean
    churnedSubscriptions?: boolean
    newSubscriptions?: boolean
    churnRate?: boolean
    growthRate?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["revenueMetric"]>

  export type RevenueMetricSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    date?: boolean
    period?: boolean
    totalRevenue?: boolean
    newRevenue?: boolean
    churnedRevenue?: boolean
    upgradeRevenue?: boolean
    downgradeRevenue?: boolean
    activeSubscriptions?: boolean
    trialSubscriptions?: boolean
    churnedSubscriptions?: boolean
    newSubscriptions?: boolean
    churnRate?: boolean
    growthRate?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["revenueMetric"]>

  export type RevenueMetricSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    date?: boolean
    period?: boolean
    totalRevenue?: boolean
    newRevenue?: boolean
    churnedRevenue?: boolean
    upgradeRevenue?: boolean
    downgradeRevenue?: boolean
    activeSubscriptions?: boolean
    trialSubscriptions?: boolean
    churnedSubscriptions?: boolean
    newSubscriptions?: boolean
    churnRate?: boolean
    growthRate?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["revenueMetric"]>

  export type RevenueMetricSelectScalar = {
    id?: boolean
    date?: boolean
    period?: boolean
    totalRevenue?: boolean
    newRevenue?: boolean
    churnedRevenue?: boolean
    upgradeRevenue?: boolean
    downgradeRevenue?: boolean
    activeSubscriptions?: boolean
    trialSubscriptions?: boolean
    churnedSubscriptions?: boolean
    newSubscriptions?: boolean
    churnRate?: boolean
    growthRate?: boolean
    createdAt?: boolean
  }

  export type RevenueMetricOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "date" | "period" | "totalRevenue" | "newRevenue" | "churnedRevenue" | "upgradeRevenue" | "downgradeRevenue" | "activeSubscriptions" | "trialSubscriptions" | "churnedSubscriptions" | "newSubscriptions" | "churnRate" | "growthRate" | "createdAt", ExtArgs["result"]["revenueMetric"]>

  export type $RevenueMetricPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "RevenueMetric"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      date: Date
      period: $Enums.MetricPeriod
      totalRevenue: Prisma.Decimal
      newRevenue: Prisma.Decimal
      churnedRevenue: Prisma.Decimal
      upgradeRevenue: Prisma.Decimal
      downgradeRevenue: Prisma.Decimal
      activeSubscriptions: number
      trialSubscriptions: number
      churnedSubscriptions: number
      newSubscriptions: number
      churnRate: Prisma.Decimal | null
      growthRate: Prisma.Decimal | null
      createdAt: Date
    }, ExtArgs["result"]["revenueMetric"]>
    composites: {}
  }

  type RevenueMetricGetPayload<S extends boolean | null | undefined | RevenueMetricDefaultArgs> = $Result.GetResult<Prisma.$RevenueMetricPayload, S>

  type RevenueMetricCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<RevenueMetricFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: RevenueMetricCountAggregateInputType | true
    }

  export interface RevenueMetricDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['RevenueMetric'], meta: { name: 'RevenueMetric' } }
    /**
     * Find zero or one RevenueMetric that matches the filter.
     * @param {RevenueMetricFindUniqueArgs} args - Arguments to find a RevenueMetric
     * @example
     * // Get one RevenueMetric
     * const revenueMetric = await prisma.revenueMetric.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RevenueMetricFindUniqueArgs>(args: SelectSubset<T, RevenueMetricFindUniqueArgs<ExtArgs>>): Prisma__RevenueMetricClient<$Result.GetResult<Prisma.$RevenueMetricPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one RevenueMetric that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {RevenueMetricFindUniqueOrThrowArgs} args - Arguments to find a RevenueMetric
     * @example
     * // Get one RevenueMetric
     * const revenueMetric = await prisma.revenueMetric.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RevenueMetricFindUniqueOrThrowArgs>(args: SelectSubset<T, RevenueMetricFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RevenueMetricClient<$Result.GetResult<Prisma.$RevenueMetricPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first RevenueMetric that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RevenueMetricFindFirstArgs} args - Arguments to find a RevenueMetric
     * @example
     * // Get one RevenueMetric
     * const revenueMetric = await prisma.revenueMetric.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RevenueMetricFindFirstArgs>(args?: SelectSubset<T, RevenueMetricFindFirstArgs<ExtArgs>>): Prisma__RevenueMetricClient<$Result.GetResult<Prisma.$RevenueMetricPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first RevenueMetric that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RevenueMetricFindFirstOrThrowArgs} args - Arguments to find a RevenueMetric
     * @example
     * // Get one RevenueMetric
     * const revenueMetric = await prisma.revenueMetric.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RevenueMetricFindFirstOrThrowArgs>(args?: SelectSubset<T, RevenueMetricFindFirstOrThrowArgs<ExtArgs>>): Prisma__RevenueMetricClient<$Result.GetResult<Prisma.$RevenueMetricPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more RevenueMetrics that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RevenueMetricFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all RevenueMetrics
     * const revenueMetrics = await prisma.revenueMetric.findMany()
     * 
     * // Get first 10 RevenueMetrics
     * const revenueMetrics = await prisma.revenueMetric.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const revenueMetricWithIdOnly = await prisma.revenueMetric.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RevenueMetricFindManyArgs>(args?: SelectSubset<T, RevenueMetricFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RevenueMetricPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a RevenueMetric.
     * @param {RevenueMetricCreateArgs} args - Arguments to create a RevenueMetric.
     * @example
     * // Create one RevenueMetric
     * const RevenueMetric = await prisma.revenueMetric.create({
     *   data: {
     *     // ... data to create a RevenueMetric
     *   }
     * })
     * 
     */
    create<T extends RevenueMetricCreateArgs>(args: SelectSubset<T, RevenueMetricCreateArgs<ExtArgs>>): Prisma__RevenueMetricClient<$Result.GetResult<Prisma.$RevenueMetricPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many RevenueMetrics.
     * @param {RevenueMetricCreateManyArgs} args - Arguments to create many RevenueMetrics.
     * @example
     * // Create many RevenueMetrics
     * const revenueMetric = await prisma.revenueMetric.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RevenueMetricCreateManyArgs>(args?: SelectSubset<T, RevenueMetricCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many RevenueMetrics and returns the data saved in the database.
     * @param {RevenueMetricCreateManyAndReturnArgs} args - Arguments to create many RevenueMetrics.
     * @example
     * // Create many RevenueMetrics
     * const revenueMetric = await prisma.revenueMetric.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many RevenueMetrics and only return the `id`
     * const revenueMetricWithIdOnly = await prisma.revenueMetric.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RevenueMetricCreateManyAndReturnArgs>(args?: SelectSubset<T, RevenueMetricCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RevenueMetricPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a RevenueMetric.
     * @param {RevenueMetricDeleteArgs} args - Arguments to delete one RevenueMetric.
     * @example
     * // Delete one RevenueMetric
     * const RevenueMetric = await prisma.revenueMetric.delete({
     *   where: {
     *     // ... filter to delete one RevenueMetric
     *   }
     * })
     * 
     */
    delete<T extends RevenueMetricDeleteArgs>(args: SelectSubset<T, RevenueMetricDeleteArgs<ExtArgs>>): Prisma__RevenueMetricClient<$Result.GetResult<Prisma.$RevenueMetricPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one RevenueMetric.
     * @param {RevenueMetricUpdateArgs} args - Arguments to update one RevenueMetric.
     * @example
     * // Update one RevenueMetric
     * const revenueMetric = await prisma.revenueMetric.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RevenueMetricUpdateArgs>(args: SelectSubset<T, RevenueMetricUpdateArgs<ExtArgs>>): Prisma__RevenueMetricClient<$Result.GetResult<Prisma.$RevenueMetricPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more RevenueMetrics.
     * @param {RevenueMetricDeleteManyArgs} args - Arguments to filter RevenueMetrics to delete.
     * @example
     * // Delete a few RevenueMetrics
     * const { count } = await prisma.revenueMetric.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RevenueMetricDeleteManyArgs>(args?: SelectSubset<T, RevenueMetricDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RevenueMetrics.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RevenueMetricUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many RevenueMetrics
     * const revenueMetric = await prisma.revenueMetric.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RevenueMetricUpdateManyArgs>(args: SelectSubset<T, RevenueMetricUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RevenueMetrics and returns the data updated in the database.
     * @param {RevenueMetricUpdateManyAndReturnArgs} args - Arguments to update many RevenueMetrics.
     * @example
     * // Update many RevenueMetrics
     * const revenueMetric = await prisma.revenueMetric.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more RevenueMetrics and only return the `id`
     * const revenueMetricWithIdOnly = await prisma.revenueMetric.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends RevenueMetricUpdateManyAndReturnArgs>(args: SelectSubset<T, RevenueMetricUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RevenueMetricPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one RevenueMetric.
     * @param {RevenueMetricUpsertArgs} args - Arguments to update or create a RevenueMetric.
     * @example
     * // Update or create a RevenueMetric
     * const revenueMetric = await prisma.revenueMetric.upsert({
     *   create: {
     *     // ... data to create a RevenueMetric
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the RevenueMetric we want to update
     *   }
     * })
     */
    upsert<T extends RevenueMetricUpsertArgs>(args: SelectSubset<T, RevenueMetricUpsertArgs<ExtArgs>>): Prisma__RevenueMetricClient<$Result.GetResult<Prisma.$RevenueMetricPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of RevenueMetrics.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RevenueMetricCountArgs} args - Arguments to filter RevenueMetrics to count.
     * @example
     * // Count the number of RevenueMetrics
     * const count = await prisma.revenueMetric.count({
     *   where: {
     *     // ... the filter for the RevenueMetrics we want to count
     *   }
     * })
    **/
    count<T extends RevenueMetricCountArgs>(
      args?: Subset<T, RevenueMetricCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RevenueMetricCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a RevenueMetric.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RevenueMetricAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends RevenueMetricAggregateArgs>(args: Subset<T, RevenueMetricAggregateArgs>): Prisma.PrismaPromise<GetRevenueMetricAggregateType<T>>

    /**
     * Group by RevenueMetric.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RevenueMetricGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends RevenueMetricGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RevenueMetricGroupByArgs['orderBy'] }
        : { orderBy?: RevenueMetricGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, RevenueMetricGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRevenueMetricGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the RevenueMetric model
   */
  readonly fields: RevenueMetricFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for RevenueMetric.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RevenueMetricClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the RevenueMetric model
   */
  interface RevenueMetricFieldRefs {
    readonly id: FieldRef<"RevenueMetric", 'String'>
    readonly date: FieldRef<"RevenueMetric", 'DateTime'>
    readonly period: FieldRef<"RevenueMetric", 'MetricPeriod'>
    readonly totalRevenue: FieldRef<"RevenueMetric", 'Decimal'>
    readonly newRevenue: FieldRef<"RevenueMetric", 'Decimal'>
    readonly churnedRevenue: FieldRef<"RevenueMetric", 'Decimal'>
    readonly upgradeRevenue: FieldRef<"RevenueMetric", 'Decimal'>
    readonly downgradeRevenue: FieldRef<"RevenueMetric", 'Decimal'>
    readonly activeSubscriptions: FieldRef<"RevenueMetric", 'Int'>
    readonly trialSubscriptions: FieldRef<"RevenueMetric", 'Int'>
    readonly churnedSubscriptions: FieldRef<"RevenueMetric", 'Int'>
    readonly newSubscriptions: FieldRef<"RevenueMetric", 'Int'>
    readonly churnRate: FieldRef<"RevenueMetric", 'Decimal'>
    readonly growthRate: FieldRef<"RevenueMetric", 'Decimal'>
    readonly createdAt: FieldRef<"RevenueMetric", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * RevenueMetric findUnique
   */
  export type RevenueMetricFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RevenueMetric
     */
    select?: RevenueMetricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RevenueMetric
     */
    omit?: RevenueMetricOmit<ExtArgs> | null
    /**
     * Filter, which RevenueMetric to fetch.
     */
    where: RevenueMetricWhereUniqueInput
  }

  /**
   * RevenueMetric findUniqueOrThrow
   */
  export type RevenueMetricFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RevenueMetric
     */
    select?: RevenueMetricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RevenueMetric
     */
    omit?: RevenueMetricOmit<ExtArgs> | null
    /**
     * Filter, which RevenueMetric to fetch.
     */
    where: RevenueMetricWhereUniqueInput
  }

  /**
   * RevenueMetric findFirst
   */
  export type RevenueMetricFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RevenueMetric
     */
    select?: RevenueMetricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RevenueMetric
     */
    omit?: RevenueMetricOmit<ExtArgs> | null
    /**
     * Filter, which RevenueMetric to fetch.
     */
    where?: RevenueMetricWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RevenueMetrics to fetch.
     */
    orderBy?: RevenueMetricOrderByWithRelationInput | RevenueMetricOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RevenueMetrics.
     */
    cursor?: RevenueMetricWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RevenueMetrics from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RevenueMetrics.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RevenueMetrics.
     */
    distinct?: RevenueMetricScalarFieldEnum | RevenueMetricScalarFieldEnum[]
  }

  /**
   * RevenueMetric findFirstOrThrow
   */
  export type RevenueMetricFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RevenueMetric
     */
    select?: RevenueMetricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RevenueMetric
     */
    omit?: RevenueMetricOmit<ExtArgs> | null
    /**
     * Filter, which RevenueMetric to fetch.
     */
    where?: RevenueMetricWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RevenueMetrics to fetch.
     */
    orderBy?: RevenueMetricOrderByWithRelationInput | RevenueMetricOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RevenueMetrics.
     */
    cursor?: RevenueMetricWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RevenueMetrics from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RevenueMetrics.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RevenueMetrics.
     */
    distinct?: RevenueMetricScalarFieldEnum | RevenueMetricScalarFieldEnum[]
  }

  /**
   * RevenueMetric findMany
   */
  export type RevenueMetricFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RevenueMetric
     */
    select?: RevenueMetricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RevenueMetric
     */
    omit?: RevenueMetricOmit<ExtArgs> | null
    /**
     * Filter, which RevenueMetrics to fetch.
     */
    where?: RevenueMetricWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RevenueMetrics to fetch.
     */
    orderBy?: RevenueMetricOrderByWithRelationInput | RevenueMetricOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing RevenueMetrics.
     */
    cursor?: RevenueMetricWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RevenueMetrics from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RevenueMetrics.
     */
    skip?: number
    distinct?: RevenueMetricScalarFieldEnum | RevenueMetricScalarFieldEnum[]
  }

  /**
   * RevenueMetric create
   */
  export type RevenueMetricCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RevenueMetric
     */
    select?: RevenueMetricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RevenueMetric
     */
    omit?: RevenueMetricOmit<ExtArgs> | null
    /**
     * The data needed to create a RevenueMetric.
     */
    data: XOR<RevenueMetricCreateInput, RevenueMetricUncheckedCreateInput>
  }

  /**
   * RevenueMetric createMany
   */
  export type RevenueMetricCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many RevenueMetrics.
     */
    data: RevenueMetricCreateManyInput | RevenueMetricCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * RevenueMetric createManyAndReturn
   */
  export type RevenueMetricCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RevenueMetric
     */
    select?: RevenueMetricSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the RevenueMetric
     */
    omit?: RevenueMetricOmit<ExtArgs> | null
    /**
     * The data used to create many RevenueMetrics.
     */
    data: RevenueMetricCreateManyInput | RevenueMetricCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * RevenueMetric update
   */
  export type RevenueMetricUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RevenueMetric
     */
    select?: RevenueMetricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RevenueMetric
     */
    omit?: RevenueMetricOmit<ExtArgs> | null
    /**
     * The data needed to update a RevenueMetric.
     */
    data: XOR<RevenueMetricUpdateInput, RevenueMetricUncheckedUpdateInput>
    /**
     * Choose, which RevenueMetric to update.
     */
    where: RevenueMetricWhereUniqueInput
  }

  /**
   * RevenueMetric updateMany
   */
  export type RevenueMetricUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update RevenueMetrics.
     */
    data: XOR<RevenueMetricUpdateManyMutationInput, RevenueMetricUncheckedUpdateManyInput>
    /**
     * Filter which RevenueMetrics to update
     */
    where?: RevenueMetricWhereInput
    /**
     * Limit how many RevenueMetrics to update.
     */
    limit?: number
  }

  /**
   * RevenueMetric updateManyAndReturn
   */
  export type RevenueMetricUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RevenueMetric
     */
    select?: RevenueMetricSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the RevenueMetric
     */
    omit?: RevenueMetricOmit<ExtArgs> | null
    /**
     * The data used to update RevenueMetrics.
     */
    data: XOR<RevenueMetricUpdateManyMutationInput, RevenueMetricUncheckedUpdateManyInput>
    /**
     * Filter which RevenueMetrics to update
     */
    where?: RevenueMetricWhereInput
    /**
     * Limit how many RevenueMetrics to update.
     */
    limit?: number
  }

  /**
   * RevenueMetric upsert
   */
  export type RevenueMetricUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RevenueMetric
     */
    select?: RevenueMetricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RevenueMetric
     */
    omit?: RevenueMetricOmit<ExtArgs> | null
    /**
     * The filter to search for the RevenueMetric to update in case it exists.
     */
    where: RevenueMetricWhereUniqueInput
    /**
     * In case the RevenueMetric found by the `where` argument doesn't exist, create a new RevenueMetric with this data.
     */
    create: XOR<RevenueMetricCreateInput, RevenueMetricUncheckedCreateInput>
    /**
     * In case the RevenueMetric was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RevenueMetricUpdateInput, RevenueMetricUncheckedUpdateInput>
  }

  /**
   * RevenueMetric delete
   */
  export type RevenueMetricDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RevenueMetric
     */
    select?: RevenueMetricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RevenueMetric
     */
    omit?: RevenueMetricOmit<ExtArgs> | null
    /**
     * Filter which RevenueMetric to delete.
     */
    where: RevenueMetricWhereUniqueInput
  }

  /**
   * RevenueMetric deleteMany
   */
  export type RevenueMetricDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RevenueMetrics to delete
     */
    where?: RevenueMetricWhereInput
    /**
     * Limit how many RevenueMetrics to delete.
     */
    limit?: number
  }

  /**
   * RevenueMetric without action
   */
  export type RevenueMetricDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RevenueMetric
     */
    select?: RevenueMetricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RevenueMetric
     */
    omit?: RevenueMetricOmit<ExtArgs> | null
  }


  /**
   * Model StripeConfig
   */

  export type AggregateStripeConfig = {
    _count: StripeConfigCountAggregateOutputType | null
    _min: StripeConfigMinAggregateOutputType | null
    _max: StripeConfigMaxAggregateOutputType | null
  }

  export type StripeConfigMinAggregateOutputType = {
    id: string | null
    isLive: boolean | null
    publishableKey: string | null
    webhookSecret: string | null
    defaultCurrency: string | null
    taxRateId: string | null
    updatedBy: string | null
    updatedAt: Date | null
    createdAt: Date | null
  }

  export type StripeConfigMaxAggregateOutputType = {
    id: string | null
    isLive: boolean | null
    publishableKey: string | null
    webhookSecret: string | null
    defaultCurrency: string | null
    taxRateId: string | null
    updatedBy: string | null
    updatedAt: Date | null
    createdAt: Date | null
  }

  export type StripeConfigCountAggregateOutputType = {
    id: number
    isLive: number
    publishableKey: number
    webhookSecret: number
    defaultCurrency: number
    taxRateId: number
    updatedBy: number
    updatedAt: number
    createdAt: number
    _all: number
  }


  export type StripeConfigMinAggregateInputType = {
    id?: true
    isLive?: true
    publishableKey?: true
    webhookSecret?: true
    defaultCurrency?: true
    taxRateId?: true
    updatedBy?: true
    updatedAt?: true
    createdAt?: true
  }

  export type StripeConfigMaxAggregateInputType = {
    id?: true
    isLive?: true
    publishableKey?: true
    webhookSecret?: true
    defaultCurrency?: true
    taxRateId?: true
    updatedBy?: true
    updatedAt?: true
    createdAt?: true
  }

  export type StripeConfigCountAggregateInputType = {
    id?: true
    isLive?: true
    publishableKey?: true
    webhookSecret?: true
    defaultCurrency?: true
    taxRateId?: true
    updatedBy?: true
    updatedAt?: true
    createdAt?: true
    _all?: true
  }

  export type StripeConfigAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which StripeConfig to aggregate.
     */
    where?: StripeConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of StripeConfigs to fetch.
     */
    orderBy?: StripeConfigOrderByWithRelationInput | StripeConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: StripeConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` StripeConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` StripeConfigs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned StripeConfigs
    **/
    _count?: true | StripeConfigCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: StripeConfigMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: StripeConfigMaxAggregateInputType
  }

  export type GetStripeConfigAggregateType<T extends StripeConfigAggregateArgs> = {
        [P in keyof T & keyof AggregateStripeConfig]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateStripeConfig[P]>
      : GetScalarType<T[P], AggregateStripeConfig[P]>
  }




  export type StripeConfigGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: StripeConfigWhereInput
    orderBy?: StripeConfigOrderByWithAggregationInput | StripeConfigOrderByWithAggregationInput[]
    by: StripeConfigScalarFieldEnum[] | StripeConfigScalarFieldEnum
    having?: StripeConfigScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: StripeConfigCountAggregateInputType | true
    _min?: StripeConfigMinAggregateInputType
    _max?: StripeConfigMaxAggregateInputType
  }

  export type StripeConfigGroupByOutputType = {
    id: string
    isLive: boolean
    publishableKey: string | null
    webhookSecret: string | null
    defaultCurrency: string
    taxRateId: string | null
    updatedBy: string
    updatedAt: Date
    createdAt: Date
    _count: StripeConfigCountAggregateOutputType | null
    _min: StripeConfigMinAggregateOutputType | null
    _max: StripeConfigMaxAggregateOutputType | null
  }

  type GetStripeConfigGroupByPayload<T extends StripeConfigGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<StripeConfigGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof StripeConfigGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], StripeConfigGroupByOutputType[P]>
            : GetScalarType<T[P], StripeConfigGroupByOutputType[P]>
        }
      >
    >


  export type StripeConfigSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    isLive?: boolean
    publishableKey?: boolean
    webhookSecret?: boolean
    defaultCurrency?: boolean
    taxRateId?: boolean
    updatedBy?: boolean
    updatedAt?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["stripeConfig"]>

  export type StripeConfigSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    isLive?: boolean
    publishableKey?: boolean
    webhookSecret?: boolean
    defaultCurrency?: boolean
    taxRateId?: boolean
    updatedBy?: boolean
    updatedAt?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["stripeConfig"]>

  export type StripeConfigSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    isLive?: boolean
    publishableKey?: boolean
    webhookSecret?: boolean
    defaultCurrency?: boolean
    taxRateId?: boolean
    updatedBy?: boolean
    updatedAt?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["stripeConfig"]>

  export type StripeConfigSelectScalar = {
    id?: boolean
    isLive?: boolean
    publishableKey?: boolean
    webhookSecret?: boolean
    defaultCurrency?: boolean
    taxRateId?: boolean
    updatedBy?: boolean
    updatedAt?: boolean
    createdAt?: boolean
  }

  export type StripeConfigOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "isLive" | "publishableKey" | "webhookSecret" | "defaultCurrency" | "taxRateId" | "updatedBy" | "updatedAt" | "createdAt", ExtArgs["result"]["stripeConfig"]>

  export type $StripeConfigPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "StripeConfig"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      isLive: boolean
      publishableKey: string | null
      webhookSecret: string | null
      defaultCurrency: string
      taxRateId: string | null
      updatedBy: string
      updatedAt: Date
      createdAt: Date
    }, ExtArgs["result"]["stripeConfig"]>
    composites: {}
  }

  type StripeConfigGetPayload<S extends boolean | null | undefined | StripeConfigDefaultArgs> = $Result.GetResult<Prisma.$StripeConfigPayload, S>

  type StripeConfigCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<StripeConfigFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: StripeConfigCountAggregateInputType | true
    }

  export interface StripeConfigDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['StripeConfig'], meta: { name: 'StripeConfig' } }
    /**
     * Find zero or one StripeConfig that matches the filter.
     * @param {StripeConfigFindUniqueArgs} args - Arguments to find a StripeConfig
     * @example
     * // Get one StripeConfig
     * const stripeConfig = await prisma.stripeConfig.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends StripeConfigFindUniqueArgs>(args: SelectSubset<T, StripeConfigFindUniqueArgs<ExtArgs>>): Prisma__StripeConfigClient<$Result.GetResult<Prisma.$StripeConfigPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one StripeConfig that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {StripeConfigFindUniqueOrThrowArgs} args - Arguments to find a StripeConfig
     * @example
     * // Get one StripeConfig
     * const stripeConfig = await prisma.stripeConfig.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends StripeConfigFindUniqueOrThrowArgs>(args: SelectSubset<T, StripeConfigFindUniqueOrThrowArgs<ExtArgs>>): Prisma__StripeConfigClient<$Result.GetResult<Prisma.$StripeConfigPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first StripeConfig that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StripeConfigFindFirstArgs} args - Arguments to find a StripeConfig
     * @example
     * // Get one StripeConfig
     * const stripeConfig = await prisma.stripeConfig.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends StripeConfigFindFirstArgs>(args?: SelectSubset<T, StripeConfigFindFirstArgs<ExtArgs>>): Prisma__StripeConfigClient<$Result.GetResult<Prisma.$StripeConfigPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first StripeConfig that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StripeConfigFindFirstOrThrowArgs} args - Arguments to find a StripeConfig
     * @example
     * // Get one StripeConfig
     * const stripeConfig = await prisma.stripeConfig.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends StripeConfigFindFirstOrThrowArgs>(args?: SelectSubset<T, StripeConfigFindFirstOrThrowArgs<ExtArgs>>): Prisma__StripeConfigClient<$Result.GetResult<Prisma.$StripeConfigPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more StripeConfigs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StripeConfigFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all StripeConfigs
     * const stripeConfigs = await prisma.stripeConfig.findMany()
     * 
     * // Get first 10 StripeConfigs
     * const stripeConfigs = await prisma.stripeConfig.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const stripeConfigWithIdOnly = await prisma.stripeConfig.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends StripeConfigFindManyArgs>(args?: SelectSubset<T, StripeConfigFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$StripeConfigPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a StripeConfig.
     * @param {StripeConfigCreateArgs} args - Arguments to create a StripeConfig.
     * @example
     * // Create one StripeConfig
     * const StripeConfig = await prisma.stripeConfig.create({
     *   data: {
     *     // ... data to create a StripeConfig
     *   }
     * })
     * 
     */
    create<T extends StripeConfigCreateArgs>(args: SelectSubset<T, StripeConfigCreateArgs<ExtArgs>>): Prisma__StripeConfigClient<$Result.GetResult<Prisma.$StripeConfigPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many StripeConfigs.
     * @param {StripeConfigCreateManyArgs} args - Arguments to create many StripeConfigs.
     * @example
     * // Create many StripeConfigs
     * const stripeConfig = await prisma.stripeConfig.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends StripeConfigCreateManyArgs>(args?: SelectSubset<T, StripeConfigCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many StripeConfigs and returns the data saved in the database.
     * @param {StripeConfigCreateManyAndReturnArgs} args - Arguments to create many StripeConfigs.
     * @example
     * // Create many StripeConfigs
     * const stripeConfig = await prisma.stripeConfig.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many StripeConfigs and only return the `id`
     * const stripeConfigWithIdOnly = await prisma.stripeConfig.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends StripeConfigCreateManyAndReturnArgs>(args?: SelectSubset<T, StripeConfigCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$StripeConfigPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a StripeConfig.
     * @param {StripeConfigDeleteArgs} args - Arguments to delete one StripeConfig.
     * @example
     * // Delete one StripeConfig
     * const StripeConfig = await prisma.stripeConfig.delete({
     *   where: {
     *     // ... filter to delete one StripeConfig
     *   }
     * })
     * 
     */
    delete<T extends StripeConfigDeleteArgs>(args: SelectSubset<T, StripeConfigDeleteArgs<ExtArgs>>): Prisma__StripeConfigClient<$Result.GetResult<Prisma.$StripeConfigPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one StripeConfig.
     * @param {StripeConfigUpdateArgs} args - Arguments to update one StripeConfig.
     * @example
     * // Update one StripeConfig
     * const stripeConfig = await prisma.stripeConfig.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends StripeConfigUpdateArgs>(args: SelectSubset<T, StripeConfigUpdateArgs<ExtArgs>>): Prisma__StripeConfigClient<$Result.GetResult<Prisma.$StripeConfigPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more StripeConfigs.
     * @param {StripeConfigDeleteManyArgs} args - Arguments to filter StripeConfigs to delete.
     * @example
     * // Delete a few StripeConfigs
     * const { count } = await prisma.stripeConfig.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends StripeConfigDeleteManyArgs>(args?: SelectSubset<T, StripeConfigDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more StripeConfigs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StripeConfigUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many StripeConfigs
     * const stripeConfig = await prisma.stripeConfig.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends StripeConfigUpdateManyArgs>(args: SelectSubset<T, StripeConfigUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more StripeConfigs and returns the data updated in the database.
     * @param {StripeConfigUpdateManyAndReturnArgs} args - Arguments to update many StripeConfigs.
     * @example
     * // Update many StripeConfigs
     * const stripeConfig = await prisma.stripeConfig.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more StripeConfigs and only return the `id`
     * const stripeConfigWithIdOnly = await prisma.stripeConfig.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends StripeConfigUpdateManyAndReturnArgs>(args: SelectSubset<T, StripeConfigUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$StripeConfigPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one StripeConfig.
     * @param {StripeConfigUpsertArgs} args - Arguments to update or create a StripeConfig.
     * @example
     * // Update or create a StripeConfig
     * const stripeConfig = await prisma.stripeConfig.upsert({
     *   create: {
     *     // ... data to create a StripeConfig
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the StripeConfig we want to update
     *   }
     * })
     */
    upsert<T extends StripeConfigUpsertArgs>(args: SelectSubset<T, StripeConfigUpsertArgs<ExtArgs>>): Prisma__StripeConfigClient<$Result.GetResult<Prisma.$StripeConfigPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of StripeConfigs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StripeConfigCountArgs} args - Arguments to filter StripeConfigs to count.
     * @example
     * // Count the number of StripeConfigs
     * const count = await prisma.stripeConfig.count({
     *   where: {
     *     // ... the filter for the StripeConfigs we want to count
     *   }
     * })
    **/
    count<T extends StripeConfigCountArgs>(
      args?: Subset<T, StripeConfigCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], StripeConfigCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a StripeConfig.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StripeConfigAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends StripeConfigAggregateArgs>(args: Subset<T, StripeConfigAggregateArgs>): Prisma.PrismaPromise<GetStripeConfigAggregateType<T>>

    /**
     * Group by StripeConfig.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StripeConfigGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends StripeConfigGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: StripeConfigGroupByArgs['orderBy'] }
        : { orderBy?: StripeConfigGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, StripeConfigGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetStripeConfigGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the StripeConfig model
   */
  readonly fields: StripeConfigFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for StripeConfig.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__StripeConfigClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the StripeConfig model
   */
  interface StripeConfigFieldRefs {
    readonly id: FieldRef<"StripeConfig", 'String'>
    readonly isLive: FieldRef<"StripeConfig", 'Boolean'>
    readonly publishableKey: FieldRef<"StripeConfig", 'String'>
    readonly webhookSecret: FieldRef<"StripeConfig", 'String'>
    readonly defaultCurrency: FieldRef<"StripeConfig", 'String'>
    readonly taxRateId: FieldRef<"StripeConfig", 'String'>
    readonly updatedBy: FieldRef<"StripeConfig", 'String'>
    readonly updatedAt: FieldRef<"StripeConfig", 'DateTime'>
    readonly createdAt: FieldRef<"StripeConfig", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * StripeConfig findUnique
   */
  export type StripeConfigFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StripeConfig
     */
    select?: StripeConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StripeConfig
     */
    omit?: StripeConfigOmit<ExtArgs> | null
    /**
     * Filter, which StripeConfig to fetch.
     */
    where: StripeConfigWhereUniqueInput
  }

  /**
   * StripeConfig findUniqueOrThrow
   */
  export type StripeConfigFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StripeConfig
     */
    select?: StripeConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StripeConfig
     */
    omit?: StripeConfigOmit<ExtArgs> | null
    /**
     * Filter, which StripeConfig to fetch.
     */
    where: StripeConfigWhereUniqueInput
  }

  /**
   * StripeConfig findFirst
   */
  export type StripeConfigFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StripeConfig
     */
    select?: StripeConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StripeConfig
     */
    omit?: StripeConfigOmit<ExtArgs> | null
    /**
     * Filter, which StripeConfig to fetch.
     */
    where?: StripeConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of StripeConfigs to fetch.
     */
    orderBy?: StripeConfigOrderByWithRelationInput | StripeConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for StripeConfigs.
     */
    cursor?: StripeConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` StripeConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` StripeConfigs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of StripeConfigs.
     */
    distinct?: StripeConfigScalarFieldEnum | StripeConfigScalarFieldEnum[]
  }

  /**
   * StripeConfig findFirstOrThrow
   */
  export type StripeConfigFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StripeConfig
     */
    select?: StripeConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StripeConfig
     */
    omit?: StripeConfigOmit<ExtArgs> | null
    /**
     * Filter, which StripeConfig to fetch.
     */
    where?: StripeConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of StripeConfigs to fetch.
     */
    orderBy?: StripeConfigOrderByWithRelationInput | StripeConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for StripeConfigs.
     */
    cursor?: StripeConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` StripeConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` StripeConfigs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of StripeConfigs.
     */
    distinct?: StripeConfigScalarFieldEnum | StripeConfigScalarFieldEnum[]
  }

  /**
   * StripeConfig findMany
   */
  export type StripeConfigFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StripeConfig
     */
    select?: StripeConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StripeConfig
     */
    omit?: StripeConfigOmit<ExtArgs> | null
    /**
     * Filter, which StripeConfigs to fetch.
     */
    where?: StripeConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of StripeConfigs to fetch.
     */
    orderBy?: StripeConfigOrderByWithRelationInput | StripeConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing StripeConfigs.
     */
    cursor?: StripeConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` StripeConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` StripeConfigs.
     */
    skip?: number
    distinct?: StripeConfigScalarFieldEnum | StripeConfigScalarFieldEnum[]
  }

  /**
   * StripeConfig create
   */
  export type StripeConfigCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StripeConfig
     */
    select?: StripeConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StripeConfig
     */
    omit?: StripeConfigOmit<ExtArgs> | null
    /**
     * The data needed to create a StripeConfig.
     */
    data: XOR<StripeConfigCreateInput, StripeConfigUncheckedCreateInput>
  }

  /**
   * StripeConfig createMany
   */
  export type StripeConfigCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many StripeConfigs.
     */
    data: StripeConfigCreateManyInput | StripeConfigCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * StripeConfig createManyAndReturn
   */
  export type StripeConfigCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StripeConfig
     */
    select?: StripeConfigSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the StripeConfig
     */
    omit?: StripeConfigOmit<ExtArgs> | null
    /**
     * The data used to create many StripeConfigs.
     */
    data: StripeConfigCreateManyInput | StripeConfigCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * StripeConfig update
   */
  export type StripeConfigUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StripeConfig
     */
    select?: StripeConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StripeConfig
     */
    omit?: StripeConfigOmit<ExtArgs> | null
    /**
     * The data needed to update a StripeConfig.
     */
    data: XOR<StripeConfigUpdateInput, StripeConfigUncheckedUpdateInput>
    /**
     * Choose, which StripeConfig to update.
     */
    where: StripeConfigWhereUniqueInput
  }

  /**
   * StripeConfig updateMany
   */
  export type StripeConfigUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update StripeConfigs.
     */
    data: XOR<StripeConfigUpdateManyMutationInput, StripeConfigUncheckedUpdateManyInput>
    /**
     * Filter which StripeConfigs to update
     */
    where?: StripeConfigWhereInput
    /**
     * Limit how many StripeConfigs to update.
     */
    limit?: number
  }

  /**
   * StripeConfig updateManyAndReturn
   */
  export type StripeConfigUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StripeConfig
     */
    select?: StripeConfigSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the StripeConfig
     */
    omit?: StripeConfigOmit<ExtArgs> | null
    /**
     * The data used to update StripeConfigs.
     */
    data: XOR<StripeConfigUpdateManyMutationInput, StripeConfigUncheckedUpdateManyInput>
    /**
     * Filter which StripeConfigs to update
     */
    where?: StripeConfigWhereInput
    /**
     * Limit how many StripeConfigs to update.
     */
    limit?: number
  }

  /**
   * StripeConfig upsert
   */
  export type StripeConfigUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StripeConfig
     */
    select?: StripeConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StripeConfig
     */
    omit?: StripeConfigOmit<ExtArgs> | null
    /**
     * The filter to search for the StripeConfig to update in case it exists.
     */
    where: StripeConfigWhereUniqueInput
    /**
     * In case the StripeConfig found by the `where` argument doesn't exist, create a new StripeConfig with this data.
     */
    create: XOR<StripeConfigCreateInput, StripeConfigUncheckedCreateInput>
    /**
     * In case the StripeConfig was found with the provided `where` argument, update it with this data.
     */
    update: XOR<StripeConfigUpdateInput, StripeConfigUncheckedUpdateInput>
  }

  /**
   * StripeConfig delete
   */
  export type StripeConfigDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StripeConfig
     */
    select?: StripeConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StripeConfig
     */
    omit?: StripeConfigOmit<ExtArgs> | null
    /**
     * Filter which StripeConfig to delete.
     */
    where: StripeConfigWhereUniqueInput
  }

  /**
   * StripeConfig deleteMany
   */
  export type StripeConfigDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which StripeConfigs to delete
     */
    where?: StripeConfigWhereInput
    /**
     * Limit how many StripeConfigs to delete.
     */
    limit?: number
  }

  /**
   * StripeConfig without action
   */
  export type StripeConfigDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StripeConfig
     */
    select?: StripeConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StripeConfig
     */
    omit?: StripeConfigOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const OrganizationScalarFieldEnum: {
    id: 'id',
    name: 'name',
    slug: 'slug',
    isActive: 'isActive',
    settings: 'settings',
    stripeCustomerId: 'stripeCustomerId',
    billingEmail: 'billingEmail',
    trialEndsAt: 'trialEndsAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type OrganizationScalarFieldEnum = (typeof OrganizationScalarFieldEnum)[keyof typeof OrganizationScalarFieldEnum]


  export const UserScalarFieldEnum: {
    id: 'id',
    email: 'email',
    password: 'password',
    firstName: 'firstName',
    lastName: 'lastName',
    phone: 'phone',
    phoneCarrier: 'phoneCarrier',
    organizationId: 'organizationId',
    role: 'role',
    accountSetupToken: 'accountSetupToken',
    accountSetupTokenExpires: 'accountSetupTokenExpires',
    twoFactorSecret: 'twoFactorSecret',
    twoFactorBackupCodes: 'twoFactorBackupCodes',
    twoFactorEnabledAt: 'twoFactorEnabledAt',
    twoFactorOTP: 'twoFactorOTP',
    trustedDevices: 'trustedDevices',
    isActive: 'isActive',
    isEmailVerified: 'isEmailVerified',
    lastLoginAt: 'lastLoginAt',
    loginAttempts: 'loginAttempts',
    lockedUntil: 'lockedUntil',
    passwordResetToken: 'passwordResetToken',
    passwordResetTokenExpires: 'passwordResetTokenExpires',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const PlatformAdminScalarFieldEnum: {
    id: 'id',
    email: 'email',
    passwordHash: 'passwordHash',
    firstName: 'firstName',
    lastName: 'lastName',
    role: 'role',
    isActive: 'isActive',
    twoFactorSecret: 'twoFactorSecret',
    twoFactorEnabled: 'twoFactorEnabled',
    twoFactorBackupCodes: 'twoFactorBackupCodes',
    twoFactorOTP: 'twoFactorOTP',
    trustedDevices: 'trustedDevices',
    loginAttempts: 'loginAttempts',
    lockedUntil: 'lockedUntil',
    lastLoginAt: 'lastLoginAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type PlatformAdminScalarFieldEnum = (typeof PlatformAdminScalarFieldEnum)[keyof typeof PlatformAdminScalarFieldEnum]


  export const AdminAuditLogScalarFieldEnum: {
    id: 'id',
    adminId: 'adminId',
    action: 'action',
    resource: 'resource',
    resourceType: 'resourceType',
    details: 'details',
    ipAddress: 'ipAddress',
    userAgent: 'userAgent',
    timestamp: 'timestamp'
  };

  export type AdminAuditLogScalarFieldEnum = (typeof AdminAuditLogScalarFieldEnum)[keyof typeof AdminAuditLogScalarFieldEnum]


  export const SystemConfigScalarFieldEnum: {
    id: 'id',
    key: 'key',
    value: 'value',
    description: 'description',
    updatedBy: 'updatedBy',
    updatedAt: 'updatedAt',
    createdAt: 'createdAt'
  };

  export type SystemConfigScalarFieldEnum = (typeof SystemConfigScalarFieldEnum)[keyof typeof SystemConfigScalarFieldEnum]


  export const AdminSessionScalarFieldEnum: {
    id: 'id',
    adminId: 'adminId',
    token: 'token',
    expiresAt: 'expiresAt',
    ipAddress: 'ipAddress',
    userAgent: 'userAgent',
    isActive: 'isActive',
    createdAt: 'createdAt'
  };

  export type AdminSessionScalarFieldEnum = (typeof AdminSessionScalarFieldEnum)[keyof typeof AdminSessionScalarFieldEnum]


  export const SubscriptionScalarFieldEnum: {
    id: 'id',
    organizationId: 'organizationId',
    stripeSubscriptionId: 'stripeSubscriptionId',
    stripePriceId: 'stripePriceId',
    plan: 'plan',
    status: 'status',
    currentPeriodStart: 'currentPeriodStart',
    currentPeriodEnd: 'currentPeriodEnd',
    trialStart: 'trialStart',
    trialEnd: 'trialEnd',
    canceledAt: 'canceledAt',
    cancelAtPeriodEnd: 'cancelAtPeriodEnd',
    monthlyRevenue: 'monthlyRevenue',
    yearlyRevenue: 'yearlyRevenue',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type SubscriptionScalarFieldEnum = (typeof SubscriptionScalarFieldEnum)[keyof typeof SubscriptionScalarFieldEnum]


  export const BillingEventScalarFieldEnum: {
    id: 'id',
    organizationId: 'organizationId',
    subscriptionId: 'subscriptionId',
    stripeEventId: 'stripeEventId',
    eventType: 'eventType',
    amount: 'amount',
    currency: 'currency',
    description: 'description',
    metadata: 'metadata',
    processedAt: 'processedAt',
    createdAt: 'createdAt'
  };

  export type BillingEventScalarFieldEnum = (typeof BillingEventScalarFieldEnum)[keyof typeof BillingEventScalarFieldEnum]


  export const RevenueMetricScalarFieldEnum: {
    id: 'id',
    date: 'date',
    period: 'period',
    totalRevenue: 'totalRevenue',
    newRevenue: 'newRevenue',
    churnedRevenue: 'churnedRevenue',
    upgradeRevenue: 'upgradeRevenue',
    downgradeRevenue: 'downgradeRevenue',
    activeSubscriptions: 'activeSubscriptions',
    trialSubscriptions: 'trialSubscriptions',
    churnedSubscriptions: 'churnedSubscriptions',
    newSubscriptions: 'newSubscriptions',
    churnRate: 'churnRate',
    growthRate: 'growthRate',
    createdAt: 'createdAt'
  };

  export type RevenueMetricScalarFieldEnum = (typeof RevenueMetricScalarFieldEnum)[keyof typeof RevenueMetricScalarFieldEnum]


  export const StripeConfigScalarFieldEnum: {
    id: 'id',
    isLive: 'isLive',
    publishableKey: 'publishableKey',
    webhookSecret: 'webhookSecret',
    defaultCurrency: 'defaultCurrency',
    taxRateId: 'taxRateId',
    updatedBy: 'updatedBy',
    updatedAt: 'updatedAt',
    createdAt: 'createdAt'
  };

  export type StripeConfigScalarFieldEnum = (typeof StripeConfigScalarFieldEnum)[keyof typeof StripeConfigScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullableJsonNullValueInput: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull
  };

  export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'AdminRole'
   */
  export type EnumAdminRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AdminRole'>
    


  /**
   * Reference to a field of type 'AdminRole[]'
   */
  export type ListEnumAdminRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AdminRole[]'>
    


  /**
   * Reference to a field of type 'SubscriptionPlan'
   */
  export type EnumSubscriptionPlanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SubscriptionPlan'>
    


  /**
   * Reference to a field of type 'SubscriptionPlan[]'
   */
  export type ListEnumSubscriptionPlanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SubscriptionPlan[]'>
    


  /**
   * Reference to a field of type 'SubscriptionStatus'
   */
  export type EnumSubscriptionStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SubscriptionStatus'>
    


  /**
   * Reference to a field of type 'SubscriptionStatus[]'
   */
  export type ListEnumSubscriptionStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SubscriptionStatus[]'>
    


  /**
   * Reference to a field of type 'Decimal'
   */
  export type DecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal'>
    


  /**
   * Reference to a field of type 'Decimal[]'
   */
  export type ListDecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal[]'>
    


  /**
   * Reference to a field of type 'BillingEventType'
   */
  export type EnumBillingEventTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'BillingEventType'>
    


  /**
   * Reference to a field of type 'BillingEventType[]'
   */
  export type ListEnumBillingEventTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'BillingEventType[]'>
    


  /**
   * Reference to a field of type 'MetricPeriod'
   */
  export type EnumMetricPeriodFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'MetricPeriod'>
    


  /**
   * Reference to a field of type 'MetricPeriod[]'
   */
  export type ListEnumMetricPeriodFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'MetricPeriod[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type OrganizationWhereInput = {
    AND?: OrganizationWhereInput | OrganizationWhereInput[]
    OR?: OrganizationWhereInput[]
    NOT?: OrganizationWhereInput | OrganizationWhereInput[]
    id?: StringFilter<"Organization"> | string
    name?: StringFilter<"Organization"> | string
    slug?: StringFilter<"Organization"> | string
    isActive?: BoolFilter<"Organization"> | boolean
    settings?: JsonNullableFilter<"Organization">
    stripeCustomerId?: StringNullableFilter<"Organization"> | string | null
    billingEmail?: StringNullableFilter<"Organization"> | string | null
    trialEndsAt?: DateTimeNullableFilter<"Organization"> | Date | string | null
    createdAt?: DateTimeFilter<"Organization"> | Date | string
    updatedAt?: DateTimeFilter<"Organization"> | Date | string
    users?: UserListRelationFilter
    subscriptions?: SubscriptionListRelationFilter
    billingEvents?: BillingEventListRelationFilter
  }

  export type OrganizationOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    slug?: SortOrder
    isActive?: SortOrder
    settings?: SortOrderInput | SortOrder
    stripeCustomerId?: SortOrderInput | SortOrder
    billingEmail?: SortOrderInput | SortOrder
    trialEndsAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    users?: UserOrderByRelationAggregateInput
    subscriptions?: SubscriptionOrderByRelationAggregateInput
    billingEvents?: BillingEventOrderByRelationAggregateInput
  }

  export type OrganizationWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    slug?: string
    stripeCustomerId?: string
    AND?: OrganizationWhereInput | OrganizationWhereInput[]
    OR?: OrganizationWhereInput[]
    NOT?: OrganizationWhereInput | OrganizationWhereInput[]
    name?: StringFilter<"Organization"> | string
    isActive?: BoolFilter<"Organization"> | boolean
    settings?: JsonNullableFilter<"Organization">
    billingEmail?: StringNullableFilter<"Organization"> | string | null
    trialEndsAt?: DateTimeNullableFilter<"Organization"> | Date | string | null
    createdAt?: DateTimeFilter<"Organization"> | Date | string
    updatedAt?: DateTimeFilter<"Organization"> | Date | string
    users?: UserListRelationFilter
    subscriptions?: SubscriptionListRelationFilter
    billingEvents?: BillingEventListRelationFilter
  }, "id" | "slug" | "stripeCustomerId">

  export type OrganizationOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    slug?: SortOrder
    isActive?: SortOrder
    settings?: SortOrderInput | SortOrder
    stripeCustomerId?: SortOrderInput | SortOrder
    billingEmail?: SortOrderInput | SortOrder
    trialEndsAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: OrganizationCountOrderByAggregateInput
    _max?: OrganizationMaxOrderByAggregateInput
    _min?: OrganizationMinOrderByAggregateInput
  }

  export type OrganizationScalarWhereWithAggregatesInput = {
    AND?: OrganizationScalarWhereWithAggregatesInput | OrganizationScalarWhereWithAggregatesInput[]
    OR?: OrganizationScalarWhereWithAggregatesInput[]
    NOT?: OrganizationScalarWhereWithAggregatesInput | OrganizationScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Organization"> | string
    name?: StringWithAggregatesFilter<"Organization"> | string
    slug?: StringWithAggregatesFilter<"Organization"> | string
    isActive?: BoolWithAggregatesFilter<"Organization"> | boolean
    settings?: JsonNullableWithAggregatesFilter<"Organization">
    stripeCustomerId?: StringNullableWithAggregatesFilter<"Organization"> | string | null
    billingEmail?: StringNullableWithAggregatesFilter<"Organization"> | string | null
    trialEndsAt?: DateTimeNullableWithAggregatesFilter<"Organization"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Organization"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Organization"> | Date | string
  }

  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: StringFilter<"User"> | string
    email?: StringFilter<"User"> | string
    password?: StringNullableFilter<"User"> | string | null
    firstName?: StringFilter<"User"> | string
    lastName?: StringFilter<"User"> | string
    phone?: StringNullableFilter<"User"> | string | null
    phoneCarrier?: StringNullableFilter<"User"> | string | null
    organizationId?: StringFilter<"User"> | string
    role?: StringFilter<"User"> | string
    accountSetupToken?: StringNullableFilter<"User"> | string | null
    accountSetupTokenExpires?: DateTimeNullableFilter<"User"> | Date | string | null
    twoFactorSecret?: StringNullableFilter<"User"> | string | null
    twoFactorBackupCodes?: JsonNullableFilter<"User">
    twoFactorEnabledAt?: DateTimeNullableFilter<"User"> | Date | string | null
    twoFactorOTP?: JsonNullableFilter<"User">
    trustedDevices?: JsonNullableFilter<"User">
    isActive?: BoolFilter<"User"> | boolean
    isEmailVerified?: BoolFilter<"User"> | boolean
    lastLoginAt?: DateTimeNullableFilter<"User"> | Date | string | null
    loginAttempts?: IntFilter<"User"> | number
    lockedUntil?: DateTimeNullableFilter<"User"> | Date | string | null
    passwordResetToken?: StringNullableFilter<"User"> | string | null
    passwordResetTokenExpires?: DateTimeNullableFilter<"User"> | Date | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    organization?: XOR<OrganizationScalarRelationFilter, OrganizationWhereInput>
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    email?: SortOrder
    password?: SortOrderInput | SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    phone?: SortOrderInput | SortOrder
    phoneCarrier?: SortOrderInput | SortOrder
    organizationId?: SortOrder
    role?: SortOrder
    accountSetupToken?: SortOrderInput | SortOrder
    accountSetupTokenExpires?: SortOrderInput | SortOrder
    twoFactorSecret?: SortOrderInput | SortOrder
    twoFactorBackupCodes?: SortOrderInput | SortOrder
    twoFactorEnabledAt?: SortOrderInput | SortOrder
    twoFactorOTP?: SortOrderInput | SortOrder
    trustedDevices?: SortOrderInput | SortOrder
    isActive?: SortOrder
    isEmailVerified?: SortOrder
    lastLoginAt?: SortOrderInput | SortOrder
    loginAttempts?: SortOrder
    lockedUntil?: SortOrderInput | SortOrder
    passwordResetToken?: SortOrderInput | SortOrder
    passwordResetTokenExpires?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    organization?: OrganizationOrderByWithRelationInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    email?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    password?: StringNullableFilter<"User"> | string | null
    firstName?: StringFilter<"User"> | string
    lastName?: StringFilter<"User"> | string
    phone?: StringNullableFilter<"User"> | string | null
    phoneCarrier?: StringNullableFilter<"User"> | string | null
    organizationId?: StringFilter<"User"> | string
    role?: StringFilter<"User"> | string
    accountSetupToken?: StringNullableFilter<"User"> | string | null
    accountSetupTokenExpires?: DateTimeNullableFilter<"User"> | Date | string | null
    twoFactorSecret?: StringNullableFilter<"User"> | string | null
    twoFactorBackupCodes?: JsonNullableFilter<"User">
    twoFactorEnabledAt?: DateTimeNullableFilter<"User"> | Date | string | null
    twoFactorOTP?: JsonNullableFilter<"User">
    trustedDevices?: JsonNullableFilter<"User">
    isActive?: BoolFilter<"User"> | boolean
    isEmailVerified?: BoolFilter<"User"> | boolean
    lastLoginAt?: DateTimeNullableFilter<"User"> | Date | string | null
    loginAttempts?: IntFilter<"User"> | number
    lockedUntil?: DateTimeNullableFilter<"User"> | Date | string | null
    passwordResetToken?: StringNullableFilter<"User"> | string | null
    passwordResetTokenExpires?: DateTimeNullableFilter<"User"> | Date | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    organization?: XOR<OrganizationScalarRelationFilter, OrganizationWhereInput>
  }, "id" | "email">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    email?: SortOrder
    password?: SortOrderInput | SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    phone?: SortOrderInput | SortOrder
    phoneCarrier?: SortOrderInput | SortOrder
    organizationId?: SortOrder
    role?: SortOrder
    accountSetupToken?: SortOrderInput | SortOrder
    accountSetupTokenExpires?: SortOrderInput | SortOrder
    twoFactorSecret?: SortOrderInput | SortOrder
    twoFactorBackupCodes?: SortOrderInput | SortOrder
    twoFactorEnabledAt?: SortOrderInput | SortOrder
    twoFactorOTP?: SortOrderInput | SortOrder
    trustedDevices?: SortOrderInput | SortOrder
    isActive?: SortOrder
    isEmailVerified?: SortOrder
    lastLoginAt?: SortOrderInput | SortOrder
    loginAttempts?: SortOrder
    lockedUntil?: SortOrderInput | SortOrder
    passwordResetToken?: SortOrderInput | SortOrder
    passwordResetTokenExpires?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: UserCountOrderByAggregateInput
    _avg?: UserAvgOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
    _sum?: UserSumOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"User"> | string
    email?: StringWithAggregatesFilter<"User"> | string
    password?: StringNullableWithAggregatesFilter<"User"> | string | null
    firstName?: StringWithAggregatesFilter<"User"> | string
    lastName?: StringWithAggregatesFilter<"User"> | string
    phone?: StringNullableWithAggregatesFilter<"User"> | string | null
    phoneCarrier?: StringNullableWithAggregatesFilter<"User"> | string | null
    organizationId?: StringWithAggregatesFilter<"User"> | string
    role?: StringWithAggregatesFilter<"User"> | string
    accountSetupToken?: StringNullableWithAggregatesFilter<"User"> | string | null
    accountSetupTokenExpires?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
    twoFactorSecret?: StringNullableWithAggregatesFilter<"User"> | string | null
    twoFactorBackupCodes?: JsonNullableWithAggregatesFilter<"User">
    twoFactorEnabledAt?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
    twoFactorOTP?: JsonNullableWithAggregatesFilter<"User">
    trustedDevices?: JsonNullableWithAggregatesFilter<"User">
    isActive?: BoolWithAggregatesFilter<"User"> | boolean
    isEmailVerified?: BoolWithAggregatesFilter<"User"> | boolean
    lastLoginAt?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
    loginAttempts?: IntWithAggregatesFilter<"User"> | number
    lockedUntil?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
    passwordResetToken?: StringNullableWithAggregatesFilter<"User"> | string | null
    passwordResetTokenExpires?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
  }

  export type PlatformAdminWhereInput = {
    AND?: PlatformAdminWhereInput | PlatformAdminWhereInput[]
    OR?: PlatformAdminWhereInput[]
    NOT?: PlatformAdminWhereInput | PlatformAdminWhereInput[]
    id?: StringFilter<"PlatformAdmin"> | string
    email?: StringFilter<"PlatformAdmin"> | string
    passwordHash?: StringFilter<"PlatformAdmin"> | string
    firstName?: StringFilter<"PlatformAdmin"> | string
    lastName?: StringFilter<"PlatformAdmin"> | string
    role?: EnumAdminRoleFilter<"PlatformAdmin"> | $Enums.AdminRole
    isActive?: BoolFilter<"PlatformAdmin"> | boolean
    twoFactorSecret?: StringNullableFilter<"PlatformAdmin"> | string | null
    twoFactorEnabled?: BoolFilter<"PlatformAdmin"> | boolean
    twoFactorBackupCodes?: JsonNullableFilter<"PlatformAdmin">
    twoFactorOTP?: JsonNullableFilter<"PlatformAdmin">
    trustedDevices?: JsonNullableFilter<"PlatformAdmin">
    loginAttempts?: IntFilter<"PlatformAdmin"> | number
    lockedUntil?: DateTimeNullableFilter<"PlatformAdmin"> | Date | string | null
    lastLoginAt?: DateTimeNullableFilter<"PlatformAdmin"> | Date | string | null
    createdAt?: DateTimeFilter<"PlatformAdmin"> | Date | string
    updatedAt?: DateTimeFilter<"PlatformAdmin"> | Date | string
    auditLogs?: AdminAuditLogListRelationFilter
    sessions?: AdminSessionListRelationFilter
  }

  export type PlatformAdminOrderByWithRelationInput = {
    id?: SortOrder
    email?: SortOrder
    passwordHash?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    role?: SortOrder
    isActive?: SortOrder
    twoFactorSecret?: SortOrderInput | SortOrder
    twoFactorEnabled?: SortOrder
    twoFactorBackupCodes?: SortOrderInput | SortOrder
    twoFactorOTP?: SortOrderInput | SortOrder
    trustedDevices?: SortOrderInput | SortOrder
    loginAttempts?: SortOrder
    lockedUntil?: SortOrderInput | SortOrder
    lastLoginAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    auditLogs?: AdminAuditLogOrderByRelationAggregateInput
    sessions?: AdminSessionOrderByRelationAggregateInput
  }

  export type PlatformAdminWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    email?: string
    AND?: PlatformAdminWhereInput | PlatformAdminWhereInput[]
    OR?: PlatformAdminWhereInput[]
    NOT?: PlatformAdminWhereInput | PlatformAdminWhereInput[]
    passwordHash?: StringFilter<"PlatformAdmin"> | string
    firstName?: StringFilter<"PlatformAdmin"> | string
    lastName?: StringFilter<"PlatformAdmin"> | string
    role?: EnumAdminRoleFilter<"PlatformAdmin"> | $Enums.AdminRole
    isActive?: BoolFilter<"PlatformAdmin"> | boolean
    twoFactorSecret?: StringNullableFilter<"PlatformAdmin"> | string | null
    twoFactorEnabled?: BoolFilter<"PlatformAdmin"> | boolean
    twoFactorBackupCodes?: JsonNullableFilter<"PlatformAdmin">
    twoFactorOTP?: JsonNullableFilter<"PlatformAdmin">
    trustedDevices?: JsonNullableFilter<"PlatformAdmin">
    loginAttempts?: IntFilter<"PlatformAdmin"> | number
    lockedUntil?: DateTimeNullableFilter<"PlatformAdmin"> | Date | string | null
    lastLoginAt?: DateTimeNullableFilter<"PlatformAdmin"> | Date | string | null
    createdAt?: DateTimeFilter<"PlatformAdmin"> | Date | string
    updatedAt?: DateTimeFilter<"PlatformAdmin"> | Date | string
    auditLogs?: AdminAuditLogListRelationFilter
    sessions?: AdminSessionListRelationFilter
  }, "id" | "email">

  export type PlatformAdminOrderByWithAggregationInput = {
    id?: SortOrder
    email?: SortOrder
    passwordHash?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    role?: SortOrder
    isActive?: SortOrder
    twoFactorSecret?: SortOrderInput | SortOrder
    twoFactorEnabled?: SortOrder
    twoFactorBackupCodes?: SortOrderInput | SortOrder
    twoFactorOTP?: SortOrderInput | SortOrder
    trustedDevices?: SortOrderInput | SortOrder
    loginAttempts?: SortOrder
    lockedUntil?: SortOrderInput | SortOrder
    lastLoginAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: PlatformAdminCountOrderByAggregateInput
    _avg?: PlatformAdminAvgOrderByAggregateInput
    _max?: PlatformAdminMaxOrderByAggregateInput
    _min?: PlatformAdminMinOrderByAggregateInput
    _sum?: PlatformAdminSumOrderByAggregateInput
  }

  export type PlatformAdminScalarWhereWithAggregatesInput = {
    AND?: PlatformAdminScalarWhereWithAggregatesInput | PlatformAdminScalarWhereWithAggregatesInput[]
    OR?: PlatformAdminScalarWhereWithAggregatesInput[]
    NOT?: PlatformAdminScalarWhereWithAggregatesInput | PlatformAdminScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"PlatformAdmin"> | string
    email?: StringWithAggregatesFilter<"PlatformAdmin"> | string
    passwordHash?: StringWithAggregatesFilter<"PlatformAdmin"> | string
    firstName?: StringWithAggregatesFilter<"PlatformAdmin"> | string
    lastName?: StringWithAggregatesFilter<"PlatformAdmin"> | string
    role?: EnumAdminRoleWithAggregatesFilter<"PlatformAdmin"> | $Enums.AdminRole
    isActive?: BoolWithAggregatesFilter<"PlatformAdmin"> | boolean
    twoFactorSecret?: StringNullableWithAggregatesFilter<"PlatformAdmin"> | string | null
    twoFactorEnabled?: BoolWithAggregatesFilter<"PlatformAdmin"> | boolean
    twoFactorBackupCodes?: JsonNullableWithAggregatesFilter<"PlatformAdmin">
    twoFactorOTP?: JsonNullableWithAggregatesFilter<"PlatformAdmin">
    trustedDevices?: JsonNullableWithAggregatesFilter<"PlatformAdmin">
    loginAttempts?: IntWithAggregatesFilter<"PlatformAdmin"> | number
    lockedUntil?: DateTimeNullableWithAggregatesFilter<"PlatformAdmin"> | Date | string | null
    lastLoginAt?: DateTimeNullableWithAggregatesFilter<"PlatformAdmin"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"PlatformAdmin"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"PlatformAdmin"> | Date | string
  }

  export type AdminAuditLogWhereInput = {
    AND?: AdminAuditLogWhereInput | AdminAuditLogWhereInput[]
    OR?: AdminAuditLogWhereInput[]
    NOT?: AdminAuditLogWhereInput | AdminAuditLogWhereInput[]
    id?: StringFilter<"AdminAuditLog"> | string
    adminId?: StringFilter<"AdminAuditLog"> | string
    action?: StringFilter<"AdminAuditLog"> | string
    resource?: StringNullableFilter<"AdminAuditLog"> | string | null
    resourceType?: StringNullableFilter<"AdminAuditLog"> | string | null
    details?: JsonNullableFilter<"AdminAuditLog">
    ipAddress?: StringFilter<"AdminAuditLog"> | string
    userAgent?: StringNullableFilter<"AdminAuditLog"> | string | null
    timestamp?: DateTimeFilter<"AdminAuditLog"> | Date | string
    admin?: XOR<PlatformAdminScalarRelationFilter, PlatformAdminWhereInput>
  }

  export type AdminAuditLogOrderByWithRelationInput = {
    id?: SortOrder
    adminId?: SortOrder
    action?: SortOrder
    resource?: SortOrderInput | SortOrder
    resourceType?: SortOrderInput | SortOrder
    details?: SortOrderInput | SortOrder
    ipAddress?: SortOrder
    userAgent?: SortOrderInput | SortOrder
    timestamp?: SortOrder
    admin?: PlatformAdminOrderByWithRelationInput
  }

  export type AdminAuditLogWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: AdminAuditLogWhereInput | AdminAuditLogWhereInput[]
    OR?: AdminAuditLogWhereInput[]
    NOT?: AdminAuditLogWhereInput | AdminAuditLogWhereInput[]
    adminId?: StringFilter<"AdminAuditLog"> | string
    action?: StringFilter<"AdminAuditLog"> | string
    resource?: StringNullableFilter<"AdminAuditLog"> | string | null
    resourceType?: StringNullableFilter<"AdminAuditLog"> | string | null
    details?: JsonNullableFilter<"AdminAuditLog">
    ipAddress?: StringFilter<"AdminAuditLog"> | string
    userAgent?: StringNullableFilter<"AdminAuditLog"> | string | null
    timestamp?: DateTimeFilter<"AdminAuditLog"> | Date | string
    admin?: XOR<PlatformAdminScalarRelationFilter, PlatformAdminWhereInput>
  }, "id">

  export type AdminAuditLogOrderByWithAggregationInput = {
    id?: SortOrder
    adminId?: SortOrder
    action?: SortOrder
    resource?: SortOrderInput | SortOrder
    resourceType?: SortOrderInput | SortOrder
    details?: SortOrderInput | SortOrder
    ipAddress?: SortOrder
    userAgent?: SortOrderInput | SortOrder
    timestamp?: SortOrder
    _count?: AdminAuditLogCountOrderByAggregateInput
    _max?: AdminAuditLogMaxOrderByAggregateInput
    _min?: AdminAuditLogMinOrderByAggregateInput
  }

  export type AdminAuditLogScalarWhereWithAggregatesInput = {
    AND?: AdminAuditLogScalarWhereWithAggregatesInput | AdminAuditLogScalarWhereWithAggregatesInput[]
    OR?: AdminAuditLogScalarWhereWithAggregatesInput[]
    NOT?: AdminAuditLogScalarWhereWithAggregatesInput | AdminAuditLogScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"AdminAuditLog"> | string
    adminId?: StringWithAggregatesFilter<"AdminAuditLog"> | string
    action?: StringWithAggregatesFilter<"AdminAuditLog"> | string
    resource?: StringNullableWithAggregatesFilter<"AdminAuditLog"> | string | null
    resourceType?: StringNullableWithAggregatesFilter<"AdminAuditLog"> | string | null
    details?: JsonNullableWithAggregatesFilter<"AdminAuditLog">
    ipAddress?: StringWithAggregatesFilter<"AdminAuditLog"> | string
    userAgent?: StringNullableWithAggregatesFilter<"AdminAuditLog"> | string | null
    timestamp?: DateTimeWithAggregatesFilter<"AdminAuditLog"> | Date | string
  }

  export type SystemConfigWhereInput = {
    AND?: SystemConfigWhereInput | SystemConfigWhereInput[]
    OR?: SystemConfigWhereInput[]
    NOT?: SystemConfigWhereInput | SystemConfigWhereInput[]
    id?: StringFilter<"SystemConfig"> | string
    key?: StringFilter<"SystemConfig"> | string
    value?: JsonFilter<"SystemConfig">
    description?: StringNullableFilter<"SystemConfig"> | string | null
    updatedBy?: StringNullableFilter<"SystemConfig"> | string | null
    updatedAt?: DateTimeFilter<"SystemConfig"> | Date | string
    createdAt?: DateTimeFilter<"SystemConfig"> | Date | string
  }

  export type SystemConfigOrderByWithRelationInput = {
    id?: SortOrder
    key?: SortOrder
    value?: SortOrder
    description?: SortOrderInput | SortOrder
    updatedBy?: SortOrderInput | SortOrder
    updatedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type SystemConfigWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    key?: string
    AND?: SystemConfigWhereInput | SystemConfigWhereInput[]
    OR?: SystemConfigWhereInput[]
    NOT?: SystemConfigWhereInput | SystemConfigWhereInput[]
    value?: JsonFilter<"SystemConfig">
    description?: StringNullableFilter<"SystemConfig"> | string | null
    updatedBy?: StringNullableFilter<"SystemConfig"> | string | null
    updatedAt?: DateTimeFilter<"SystemConfig"> | Date | string
    createdAt?: DateTimeFilter<"SystemConfig"> | Date | string
  }, "id" | "key">

  export type SystemConfigOrderByWithAggregationInput = {
    id?: SortOrder
    key?: SortOrder
    value?: SortOrder
    description?: SortOrderInput | SortOrder
    updatedBy?: SortOrderInput | SortOrder
    updatedAt?: SortOrder
    createdAt?: SortOrder
    _count?: SystemConfigCountOrderByAggregateInput
    _max?: SystemConfigMaxOrderByAggregateInput
    _min?: SystemConfigMinOrderByAggregateInput
  }

  export type SystemConfigScalarWhereWithAggregatesInput = {
    AND?: SystemConfigScalarWhereWithAggregatesInput | SystemConfigScalarWhereWithAggregatesInput[]
    OR?: SystemConfigScalarWhereWithAggregatesInput[]
    NOT?: SystemConfigScalarWhereWithAggregatesInput | SystemConfigScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"SystemConfig"> | string
    key?: StringWithAggregatesFilter<"SystemConfig"> | string
    value?: JsonWithAggregatesFilter<"SystemConfig">
    description?: StringNullableWithAggregatesFilter<"SystemConfig"> | string | null
    updatedBy?: StringNullableWithAggregatesFilter<"SystemConfig"> | string | null
    updatedAt?: DateTimeWithAggregatesFilter<"SystemConfig"> | Date | string
    createdAt?: DateTimeWithAggregatesFilter<"SystemConfig"> | Date | string
  }

  export type AdminSessionWhereInput = {
    AND?: AdminSessionWhereInput | AdminSessionWhereInput[]
    OR?: AdminSessionWhereInput[]
    NOT?: AdminSessionWhereInput | AdminSessionWhereInput[]
    id?: StringFilter<"AdminSession"> | string
    adminId?: StringFilter<"AdminSession"> | string
    token?: StringFilter<"AdminSession"> | string
    expiresAt?: DateTimeFilter<"AdminSession"> | Date | string
    ipAddress?: StringNullableFilter<"AdminSession"> | string | null
    userAgent?: StringNullableFilter<"AdminSession"> | string | null
    isActive?: BoolFilter<"AdminSession"> | boolean
    createdAt?: DateTimeFilter<"AdminSession"> | Date | string
    admin?: XOR<PlatformAdminScalarRelationFilter, PlatformAdminWhereInput>
  }

  export type AdminSessionOrderByWithRelationInput = {
    id?: SortOrder
    adminId?: SortOrder
    token?: SortOrder
    expiresAt?: SortOrder
    ipAddress?: SortOrderInput | SortOrder
    userAgent?: SortOrderInput | SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    admin?: PlatformAdminOrderByWithRelationInput
  }

  export type AdminSessionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    token?: string
    AND?: AdminSessionWhereInput | AdminSessionWhereInput[]
    OR?: AdminSessionWhereInput[]
    NOT?: AdminSessionWhereInput | AdminSessionWhereInput[]
    adminId?: StringFilter<"AdminSession"> | string
    expiresAt?: DateTimeFilter<"AdminSession"> | Date | string
    ipAddress?: StringNullableFilter<"AdminSession"> | string | null
    userAgent?: StringNullableFilter<"AdminSession"> | string | null
    isActive?: BoolFilter<"AdminSession"> | boolean
    createdAt?: DateTimeFilter<"AdminSession"> | Date | string
    admin?: XOR<PlatformAdminScalarRelationFilter, PlatformAdminWhereInput>
  }, "id" | "token">

  export type AdminSessionOrderByWithAggregationInput = {
    id?: SortOrder
    adminId?: SortOrder
    token?: SortOrder
    expiresAt?: SortOrder
    ipAddress?: SortOrderInput | SortOrder
    userAgent?: SortOrderInput | SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    _count?: AdminSessionCountOrderByAggregateInput
    _max?: AdminSessionMaxOrderByAggregateInput
    _min?: AdminSessionMinOrderByAggregateInput
  }

  export type AdminSessionScalarWhereWithAggregatesInput = {
    AND?: AdminSessionScalarWhereWithAggregatesInput | AdminSessionScalarWhereWithAggregatesInput[]
    OR?: AdminSessionScalarWhereWithAggregatesInput[]
    NOT?: AdminSessionScalarWhereWithAggregatesInput | AdminSessionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"AdminSession"> | string
    adminId?: StringWithAggregatesFilter<"AdminSession"> | string
    token?: StringWithAggregatesFilter<"AdminSession"> | string
    expiresAt?: DateTimeWithAggregatesFilter<"AdminSession"> | Date | string
    ipAddress?: StringNullableWithAggregatesFilter<"AdminSession"> | string | null
    userAgent?: StringNullableWithAggregatesFilter<"AdminSession"> | string | null
    isActive?: BoolWithAggregatesFilter<"AdminSession"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"AdminSession"> | Date | string
  }

  export type SubscriptionWhereInput = {
    AND?: SubscriptionWhereInput | SubscriptionWhereInput[]
    OR?: SubscriptionWhereInput[]
    NOT?: SubscriptionWhereInput | SubscriptionWhereInput[]
    id?: StringFilter<"Subscription"> | string
    organizationId?: StringFilter<"Subscription"> | string
    stripeSubscriptionId?: StringNullableFilter<"Subscription"> | string | null
    stripePriceId?: StringNullableFilter<"Subscription"> | string | null
    plan?: EnumSubscriptionPlanFilter<"Subscription"> | $Enums.SubscriptionPlan
    status?: EnumSubscriptionStatusFilter<"Subscription"> | $Enums.SubscriptionStatus
    currentPeriodStart?: DateTimeFilter<"Subscription"> | Date | string
    currentPeriodEnd?: DateTimeFilter<"Subscription"> | Date | string
    trialStart?: DateTimeNullableFilter<"Subscription"> | Date | string | null
    trialEnd?: DateTimeNullableFilter<"Subscription"> | Date | string | null
    canceledAt?: DateTimeNullableFilter<"Subscription"> | Date | string | null
    cancelAtPeriodEnd?: BoolFilter<"Subscription"> | boolean
    monthlyRevenue?: DecimalNullableFilter<"Subscription"> | Decimal | DecimalJsLike | number | string | null
    yearlyRevenue?: DecimalNullableFilter<"Subscription"> | Decimal | DecimalJsLike | number | string | null
    createdAt?: DateTimeFilter<"Subscription"> | Date | string
    updatedAt?: DateTimeFilter<"Subscription"> | Date | string
    organization?: XOR<OrganizationScalarRelationFilter, OrganizationWhereInput>
    billingEvents?: BillingEventListRelationFilter
  }

  export type SubscriptionOrderByWithRelationInput = {
    id?: SortOrder
    organizationId?: SortOrder
    stripeSubscriptionId?: SortOrderInput | SortOrder
    stripePriceId?: SortOrderInput | SortOrder
    plan?: SortOrder
    status?: SortOrder
    currentPeriodStart?: SortOrder
    currentPeriodEnd?: SortOrder
    trialStart?: SortOrderInput | SortOrder
    trialEnd?: SortOrderInput | SortOrder
    canceledAt?: SortOrderInput | SortOrder
    cancelAtPeriodEnd?: SortOrder
    monthlyRevenue?: SortOrderInput | SortOrder
    yearlyRevenue?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    organization?: OrganizationOrderByWithRelationInput
    billingEvents?: BillingEventOrderByRelationAggregateInput
  }

  export type SubscriptionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    stripeSubscriptionId?: string
    AND?: SubscriptionWhereInput | SubscriptionWhereInput[]
    OR?: SubscriptionWhereInput[]
    NOT?: SubscriptionWhereInput | SubscriptionWhereInput[]
    organizationId?: StringFilter<"Subscription"> | string
    stripePriceId?: StringNullableFilter<"Subscription"> | string | null
    plan?: EnumSubscriptionPlanFilter<"Subscription"> | $Enums.SubscriptionPlan
    status?: EnumSubscriptionStatusFilter<"Subscription"> | $Enums.SubscriptionStatus
    currentPeriodStart?: DateTimeFilter<"Subscription"> | Date | string
    currentPeriodEnd?: DateTimeFilter<"Subscription"> | Date | string
    trialStart?: DateTimeNullableFilter<"Subscription"> | Date | string | null
    trialEnd?: DateTimeNullableFilter<"Subscription"> | Date | string | null
    canceledAt?: DateTimeNullableFilter<"Subscription"> | Date | string | null
    cancelAtPeriodEnd?: BoolFilter<"Subscription"> | boolean
    monthlyRevenue?: DecimalNullableFilter<"Subscription"> | Decimal | DecimalJsLike | number | string | null
    yearlyRevenue?: DecimalNullableFilter<"Subscription"> | Decimal | DecimalJsLike | number | string | null
    createdAt?: DateTimeFilter<"Subscription"> | Date | string
    updatedAt?: DateTimeFilter<"Subscription"> | Date | string
    organization?: XOR<OrganizationScalarRelationFilter, OrganizationWhereInput>
    billingEvents?: BillingEventListRelationFilter
  }, "id" | "stripeSubscriptionId">

  export type SubscriptionOrderByWithAggregationInput = {
    id?: SortOrder
    organizationId?: SortOrder
    stripeSubscriptionId?: SortOrderInput | SortOrder
    stripePriceId?: SortOrderInput | SortOrder
    plan?: SortOrder
    status?: SortOrder
    currentPeriodStart?: SortOrder
    currentPeriodEnd?: SortOrder
    trialStart?: SortOrderInput | SortOrder
    trialEnd?: SortOrderInput | SortOrder
    canceledAt?: SortOrderInput | SortOrder
    cancelAtPeriodEnd?: SortOrder
    monthlyRevenue?: SortOrderInput | SortOrder
    yearlyRevenue?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: SubscriptionCountOrderByAggregateInput
    _avg?: SubscriptionAvgOrderByAggregateInput
    _max?: SubscriptionMaxOrderByAggregateInput
    _min?: SubscriptionMinOrderByAggregateInput
    _sum?: SubscriptionSumOrderByAggregateInput
  }

  export type SubscriptionScalarWhereWithAggregatesInput = {
    AND?: SubscriptionScalarWhereWithAggregatesInput | SubscriptionScalarWhereWithAggregatesInput[]
    OR?: SubscriptionScalarWhereWithAggregatesInput[]
    NOT?: SubscriptionScalarWhereWithAggregatesInput | SubscriptionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Subscription"> | string
    organizationId?: StringWithAggregatesFilter<"Subscription"> | string
    stripeSubscriptionId?: StringNullableWithAggregatesFilter<"Subscription"> | string | null
    stripePriceId?: StringNullableWithAggregatesFilter<"Subscription"> | string | null
    plan?: EnumSubscriptionPlanWithAggregatesFilter<"Subscription"> | $Enums.SubscriptionPlan
    status?: EnumSubscriptionStatusWithAggregatesFilter<"Subscription"> | $Enums.SubscriptionStatus
    currentPeriodStart?: DateTimeWithAggregatesFilter<"Subscription"> | Date | string
    currentPeriodEnd?: DateTimeWithAggregatesFilter<"Subscription"> | Date | string
    trialStart?: DateTimeNullableWithAggregatesFilter<"Subscription"> | Date | string | null
    trialEnd?: DateTimeNullableWithAggregatesFilter<"Subscription"> | Date | string | null
    canceledAt?: DateTimeNullableWithAggregatesFilter<"Subscription"> | Date | string | null
    cancelAtPeriodEnd?: BoolWithAggregatesFilter<"Subscription"> | boolean
    monthlyRevenue?: DecimalNullableWithAggregatesFilter<"Subscription"> | Decimal | DecimalJsLike | number | string | null
    yearlyRevenue?: DecimalNullableWithAggregatesFilter<"Subscription"> | Decimal | DecimalJsLike | number | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Subscription"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Subscription"> | Date | string
  }

  export type BillingEventWhereInput = {
    AND?: BillingEventWhereInput | BillingEventWhereInput[]
    OR?: BillingEventWhereInput[]
    NOT?: BillingEventWhereInput | BillingEventWhereInput[]
    id?: StringFilter<"BillingEvent"> | string
    organizationId?: StringFilter<"BillingEvent"> | string
    subscriptionId?: StringNullableFilter<"BillingEvent"> | string | null
    stripeEventId?: StringNullableFilter<"BillingEvent"> | string | null
    eventType?: EnumBillingEventTypeFilter<"BillingEvent"> | $Enums.BillingEventType
    amount?: DecimalNullableFilter<"BillingEvent"> | Decimal | DecimalJsLike | number | string | null
    currency?: StringNullableFilter<"BillingEvent"> | string | null
    description?: StringNullableFilter<"BillingEvent"> | string | null
    metadata?: JsonNullableFilter<"BillingEvent">
    processedAt?: DateTimeNullableFilter<"BillingEvent"> | Date | string | null
    createdAt?: DateTimeFilter<"BillingEvent"> | Date | string
    organization?: XOR<OrganizationScalarRelationFilter, OrganizationWhereInput>
    subscription?: XOR<SubscriptionNullableScalarRelationFilter, SubscriptionWhereInput> | null
  }

  export type BillingEventOrderByWithRelationInput = {
    id?: SortOrder
    organizationId?: SortOrder
    subscriptionId?: SortOrderInput | SortOrder
    stripeEventId?: SortOrderInput | SortOrder
    eventType?: SortOrder
    amount?: SortOrderInput | SortOrder
    currency?: SortOrderInput | SortOrder
    description?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    processedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    organization?: OrganizationOrderByWithRelationInput
    subscription?: SubscriptionOrderByWithRelationInput
  }

  export type BillingEventWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    stripeEventId?: string
    AND?: BillingEventWhereInput | BillingEventWhereInput[]
    OR?: BillingEventWhereInput[]
    NOT?: BillingEventWhereInput | BillingEventWhereInput[]
    organizationId?: StringFilter<"BillingEvent"> | string
    subscriptionId?: StringNullableFilter<"BillingEvent"> | string | null
    eventType?: EnumBillingEventTypeFilter<"BillingEvent"> | $Enums.BillingEventType
    amount?: DecimalNullableFilter<"BillingEvent"> | Decimal | DecimalJsLike | number | string | null
    currency?: StringNullableFilter<"BillingEvent"> | string | null
    description?: StringNullableFilter<"BillingEvent"> | string | null
    metadata?: JsonNullableFilter<"BillingEvent">
    processedAt?: DateTimeNullableFilter<"BillingEvent"> | Date | string | null
    createdAt?: DateTimeFilter<"BillingEvent"> | Date | string
    organization?: XOR<OrganizationScalarRelationFilter, OrganizationWhereInput>
    subscription?: XOR<SubscriptionNullableScalarRelationFilter, SubscriptionWhereInput> | null
  }, "id" | "stripeEventId">

  export type BillingEventOrderByWithAggregationInput = {
    id?: SortOrder
    organizationId?: SortOrder
    subscriptionId?: SortOrderInput | SortOrder
    stripeEventId?: SortOrderInput | SortOrder
    eventType?: SortOrder
    amount?: SortOrderInput | SortOrder
    currency?: SortOrderInput | SortOrder
    description?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    processedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: BillingEventCountOrderByAggregateInput
    _avg?: BillingEventAvgOrderByAggregateInput
    _max?: BillingEventMaxOrderByAggregateInput
    _min?: BillingEventMinOrderByAggregateInput
    _sum?: BillingEventSumOrderByAggregateInput
  }

  export type BillingEventScalarWhereWithAggregatesInput = {
    AND?: BillingEventScalarWhereWithAggregatesInput | BillingEventScalarWhereWithAggregatesInput[]
    OR?: BillingEventScalarWhereWithAggregatesInput[]
    NOT?: BillingEventScalarWhereWithAggregatesInput | BillingEventScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"BillingEvent"> | string
    organizationId?: StringWithAggregatesFilter<"BillingEvent"> | string
    subscriptionId?: StringNullableWithAggregatesFilter<"BillingEvent"> | string | null
    stripeEventId?: StringNullableWithAggregatesFilter<"BillingEvent"> | string | null
    eventType?: EnumBillingEventTypeWithAggregatesFilter<"BillingEvent"> | $Enums.BillingEventType
    amount?: DecimalNullableWithAggregatesFilter<"BillingEvent"> | Decimal | DecimalJsLike | number | string | null
    currency?: StringNullableWithAggregatesFilter<"BillingEvent"> | string | null
    description?: StringNullableWithAggregatesFilter<"BillingEvent"> | string | null
    metadata?: JsonNullableWithAggregatesFilter<"BillingEvent">
    processedAt?: DateTimeNullableWithAggregatesFilter<"BillingEvent"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"BillingEvent"> | Date | string
  }

  export type RevenueMetricWhereInput = {
    AND?: RevenueMetricWhereInput | RevenueMetricWhereInput[]
    OR?: RevenueMetricWhereInput[]
    NOT?: RevenueMetricWhereInput | RevenueMetricWhereInput[]
    id?: StringFilter<"RevenueMetric"> | string
    date?: DateTimeFilter<"RevenueMetric"> | Date | string
    period?: EnumMetricPeriodFilter<"RevenueMetric"> | $Enums.MetricPeriod
    totalRevenue?: DecimalFilter<"RevenueMetric"> | Decimal | DecimalJsLike | number | string
    newRevenue?: DecimalFilter<"RevenueMetric"> | Decimal | DecimalJsLike | number | string
    churnedRevenue?: DecimalFilter<"RevenueMetric"> | Decimal | DecimalJsLike | number | string
    upgradeRevenue?: DecimalFilter<"RevenueMetric"> | Decimal | DecimalJsLike | number | string
    downgradeRevenue?: DecimalFilter<"RevenueMetric"> | Decimal | DecimalJsLike | number | string
    activeSubscriptions?: IntFilter<"RevenueMetric"> | number
    trialSubscriptions?: IntFilter<"RevenueMetric"> | number
    churnedSubscriptions?: IntFilter<"RevenueMetric"> | number
    newSubscriptions?: IntFilter<"RevenueMetric"> | number
    churnRate?: DecimalNullableFilter<"RevenueMetric"> | Decimal | DecimalJsLike | number | string | null
    growthRate?: DecimalNullableFilter<"RevenueMetric"> | Decimal | DecimalJsLike | number | string | null
    createdAt?: DateTimeFilter<"RevenueMetric"> | Date | string
  }

  export type RevenueMetricOrderByWithRelationInput = {
    id?: SortOrder
    date?: SortOrder
    period?: SortOrder
    totalRevenue?: SortOrder
    newRevenue?: SortOrder
    churnedRevenue?: SortOrder
    upgradeRevenue?: SortOrder
    downgradeRevenue?: SortOrder
    activeSubscriptions?: SortOrder
    trialSubscriptions?: SortOrder
    churnedSubscriptions?: SortOrder
    newSubscriptions?: SortOrder
    churnRate?: SortOrderInput | SortOrder
    growthRate?: SortOrderInput | SortOrder
    createdAt?: SortOrder
  }

  export type RevenueMetricWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    date_period?: RevenueMetricDatePeriodCompoundUniqueInput
    AND?: RevenueMetricWhereInput | RevenueMetricWhereInput[]
    OR?: RevenueMetricWhereInput[]
    NOT?: RevenueMetricWhereInput | RevenueMetricWhereInput[]
    date?: DateTimeFilter<"RevenueMetric"> | Date | string
    period?: EnumMetricPeriodFilter<"RevenueMetric"> | $Enums.MetricPeriod
    totalRevenue?: DecimalFilter<"RevenueMetric"> | Decimal | DecimalJsLike | number | string
    newRevenue?: DecimalFilter<"RevenueMetric"> | Decimal | DecimalJsLike | number | string
    churnedRevenue?: DecimalFilter<"RevenueMetric"> | Decimal | DecimalJsLike | number | string
    upgradeRevenue?: DecimalFilter<"RevenueMetric"> | Decimal | DecimalJsLike | number | string
    downgradeRevenue?: DecimalFilter<"RevenueMetric"> | Decimal | DecimalJsLike | number | string
    activeSubscriptions?: IntFilter<"RevenueMetric"> | number
    trialSubscriptions?: IntFilter<"RevenueMetric"> | number
    churnedSubscriptions?: IntFilter<"RevenueMetric"> | number
    newSubscriptions?: IntFilter<"RevenueMetric"> | number
    churnRate?: DecimalNullableFilter<"RevenueMetric"> | Decimal | DecimalJsLike | number | string | null
    growthRate?: DecimalNullableFilter<"RevenueMetric"> | Decimal | DecimalJsLike | number | string | null
    createdAt?: DateTimeFilter<"RevenueMetric"> | Date | string
  }, "id" | "date_period">

  export type RevenueMetricOrderByWithAggregationInput = {
    id?: SortOrder
    date?: SortOrder
    period?: SortOrder
    totalRevenue?: SortOrder
    newRevenue?: SortOrder
    churnedRevenue?: SortOrder
    upgradeRevenue?: SortOrder
    downgradeRevenue?: SortOrder
    activeSubscriptions?: SortOrder
    trialSubscriptions?: SortOrder
    churnedSubscriptions?: SortOrder
    newSubscriptions?: SortOrder
    churnRate?: SortOrderInput | SortOrder
    growthRate?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: RevenueMetricCountOrderByAggregateInput
    _avg?: RevenueMetricAvgOrderByAggregateInput
    _max?: RevenueMetricMaxOrderByAggregateInput
    _min?: RevenueMetricMinOrderByAggregateInput
    _sum?: RevenueMetricSumOrderByAggregateInput
  }

  export type RevenueMetricScalarWhereWithAggregatesInput = {
    AND?: RevenueMetricScalarWhereWithAggregatesInput | RevenueMetricScalarWhereWithAggregatesInput[]
    OR?: RevenueMetricScalarWhereWithAggregatesInput[]
    NOT?: RevenueMetricScalarWhereWithAggregatesInput | RevenueMetricScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"RevenueMetric"> | string
    date?: DateTimeWithAggregatesFilter<"RevenueMetric"> | Date | string
    period?: EnumMetricPeriodWithAggregatesFilter<"RevenueMetric"> | $Enums.MetricPeriod
    totalRevenue?: DecimalWithAggregatesFilter<"RevenueMetric"> | Decimal | DecimalJsLike | number | string
    newRevenue?: DecimalWithAggregatesFilter<"RevenueMetric"> | Decimal | DecimalJsLike | number | string
    churnedRevenue?: DecimalWithAggregatesFilter<"RevenueMetric"> | Decimal | DecimalJsLike | number | string
    upgradeRevenue?: DecimalWithAggregatesFilter<"RevenueMetric"> | Decimal | DecimalJsLike | number | string
    downgradeRevenue?: DecimalWithAggregatesFilter<"RevenueMetric"> | Decimal | DecimalJsLike | number | string
    activeSubscriptions?: IntWithAggregatesFilter<"RevenueMetric"> | number
    trialSubscriptions?: IntWithAggregatesFilter<"RevenueMetric"> | number
    churnedSubscriptions?: IntWithAggregatesFilter<"RevenueMetric"> | number
    newSubscriptions?: IntWithAggregatesFilter<"RevenueMetric"> | number
    churnRate?: DecimalNullableWithAggregatesFilter<"RevenueMetric"> | Decimal | DecimalJsLike | number | string | null
    growthRate?: DecimalNullableWithAggregatesFilter<"RevenueMetric"> | Decimal | DecimalJsLike | number | string | null
    createdAt?: DateTimeWithAggregatesFilter<"RevenueMetric"> | Date | string
  }

  export type StripeConfigWhereInput = {
    AND?: StripeConfigWhereInput | StripeConfigWhereInput[]
    OR?: StripeConfigWhereInput[]
    NOT?: StripeConfigWhereInput | StripeConfigWhereInput[]
    id?: StringFilter<"StripeConfig"> | string
    isLive?: BoolFilter<"StripeConfig"> | boolean
    publishableKey?: StringNullableFilter<"StripeConfig"> | string | null
    webhookSecret?: StringNullableFilter<"StripeConfig"> | string | null
    defaultCurrency?: StringFilter<"StripeConfig"> | string
    taxRateId?: StringNullableFilter<"StripeConfig"> | string | null
    updatedBy?: StringFilter<"StripeConfig"> | string
    updatedAt?: DateTimeFilter<"StripeConfig"> | Date | string
    createdAt?: DateTimeFilter<"StripeConfig"> | Date | string
  }

  export type StripeConfigOrderByWithRelationInput = {
    id?: SortOrder
    isLive?: SortOrder
    publishableKey?: SortOrderInput | SortOrder
    webhookSecret?: SortOrderInput | SortOrder
    defaultCurrency?: SortOrder
    taxRateId?: SortOrderInput | SortOrder
    updatedBy?: SortOrder
    updatedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type StripeConfigWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: StripeConfigWhereInput | StripeConfigWhereInput[]
    OR?: StripeConfigWhereInput[]
    NOT?: StripeConfigWhereInput | StripeConfigWhereInput[]
    isLive?: BoolFilter<"StripeConfig"> | boolean
    publishableKey?: StringNullableFilter<"StripeConfig"> | string | null
    webhookSecret?: StringNullableFilter<"StripeConfig"> | string | null
    defaultCurrency?: StringFilter<"StripeConfig"> | string
    taxRateId?: StringNullableFilter<"StripeConfig"> | string | null
    updatedBy?: StringFilter<"StripeConfig"> | string
    updatedAt?: DateTimeFilter<"StripeConfig"> | Date | string
    createdAt?: DateTimeFilter<"StripeConfig"> | Date | string
  }, "id">

  export type StripeConfigOrderByWithAggregationInput = {
    id?: SortOrder
    isLive?: SortOrder
    publishableKey?: SortOrderInput | SortOrder
    webhookSecret?: SortOrderInput | SortOrder
    defaultCurrency?: SortOrder
    taxRateId?: SortOrderInput | SortOrder
    updatedBy?: SortOrder
    updatedAt?: SortOrder
    createdAt?: SortOrder
    _count?: StripeConfigCountOrderByAggregateInput
    _max?: StripeConfigMaxOrderByAggregateInput
    _min?: StripeConfigMinOrderByAggregateInput
  }

  export type StripeConfigScalarWhereWithAggregatesInput = {
    AND?: StripeConfigScalarWhereWithAggregatesInput | StripeConfigScalarWhereWithAggregatesInput[]
    OR?: StripeConfigScalarWhereWithAggregatesInput[]
    NOT?: StripeConfigScalarWhereWithAggregatesInput | StripeConfigScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"StripeConfig"> | string
    isLive?: BoolWithAggregatesFilter<"StripeConfig"> | boolean
    publishableKey?: StringNullableWithAggregatesFilter<"StripeConfig"> | string | null
    webhookSecret?: StringNullableWithAggregatesFilter<"StripeConfig"> | string | null
    defaultCurrency?: StringWithAggregatesFilter<"StripeConfig"> | string
    taxRateId?: StringNullableWithAggregatesFilter<"StripeConfig"> | string | null
    updatedBy?: StringWithAggregatesFilter<"StripeConfig"> | string
    updatedAt?: DateTimeWithAggregatesFilter<"StripeConfig"> | Date | string
    createdAt?: DateTimeWithAggregatesFilter<"StripeConfig"> | Date | string
  }

  export type OrganizationCreateInput = {
    id?: string
    name: string
    slug: string
    isActive?: boolean
    settings?: NullableJsonNullValueInput | InputJsonValue
    stripeCustomerId?: string | null
    billingEmail?: string | null
    trialEndsAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    users?: UserCreateNestedManyWithoutOrganizationInput
    subscriptions?: SubscriptionCreateNestedManyWithoutOrganizationInput
    billingEvents?: BillingEventCreateNestedManyWithoutOrganizationInput
  }

  export type OrganizationUncheckedCreateInput = {
    id?: string
    name: string
    slug: string
    isActive?: boolean
    settings?: NullableJsonNullValueInput | InputJsonValue
    stripeCustomerId?: string | null
    billingEmail?: string | null
    trialEndsAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    users?: UserUncheckedCreateNestedManyWithoutOrganizationInput
    subscriptions?: SubscriptionUncheckedCreateNestedManyWithoutOrganizationInput
    billingEvents?: BillingEventUncheckedCreateNestedManyWithoutOrganizationInput
  }

  export type OrganizationUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    settings?: NullableJsonNullValueInput | InputJsonValue
    stripeCustomerId?: NullableStringFieldUpdateOperationsInput | string | null
    billingEmail?: NullableStringFieldUpdateOperationsInput | string | null
    trialEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    users?: UserUpdateManyWithoutOrganizationNestedInput
    subscriptions?: SubscriptionUpdateManyWithoutOrganizationNestedInput
    billingEvents?: BillingEventUpdateManyWithoutOrganizationNestedInput
  }

  export type OrganizationUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    settings?: NullableJsonNullValueInput | InputJsonValue
    stripeCustomerId?: NullableStringFieldUpdateOperationsInput | string | null
    billingEmail?: NullableStringFieldUpdateOperationsInput | string | null
    trialEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    users?: UserUncheckedUpdateManyWithoutOrganizationNestedInput
    subscriptions?: SubscriptionUncheckedUpdateManyWithoutOrganizationNestedInput
    billingEvents?: BillingEventUncheckedUpdateManyWithoutOrganizationNestedInput
  }

  export type OrganizationCreateManyInput = {
    id?: string
    name: string
    slug: string
    isActive?: boolean
    settings?: NullableJsonNullValueInput | InputJsonValue
    stripeCustomerId?: string | null
    billingEmail?: string | null
    trialEndsAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type OrganizationUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    settings?: NullableJsonNullValueInput | InputJsonValue
    stripeCustomerId?: NullableStringFieldUpdateOperationsInput | string | null
    billingEmail?: NullableStringFieldUpdateOperationsInput | string | null
    trialEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OrganizationUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    settings?: NullableJsonNullValueInput | InputJsonValue
    stripeCustomerId?: NullableStringFieldUpdateOperationsInput | string | null
    billingEmail?: NullableStringFieldUpdateOperationsInput | string | null
    trialEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserCreateInput = {
    id?: string
    email: string
    password?: string | null
    firstName: string
    lastName: string
    phone?: string | null
    phoneCarrier?: string | null
    role?: string
    accountSetupToken?: string | null
    accountSetupTokenExpires?: Date | string | null
    twoFactorSecret?: string | null
    twoFactorBackupCodes?: NullableJsonNullValueInput | InputJsonValue
    twoFactorEnabledAt?: Date | string | null
    twoFactorOTP?: NullableJsonNullValueInput | InputJsonValue
    trustedDevices?: NullableJsonNullValueInput | InputJsonValue
    isActive?: boolean
    isEmailVerified?: boolean
    lastLoginAt?: Date | string | null
    loginAttempts?: number
    lockedUntil?: Date | string | null
    passwordResetToken?: string | null
    passwordResetTokenExpires?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    organization: OrganizationCreateNestedOneWithoutUsersInput
  }

  export type UserUncheckedCreateInput = {
    id?: string
    email: string
    password?: string | null
    firstName: string
    lastName: string
    phone?: string | null
    phoneCarrier?: string | null
    organizationId: string
    role?: string
    accountSetupToken?: string | null
    accountSetupTokenExpires?: Date | string | null
    twoFactorSecret?: string | null
    twoFactorBackupCodes?: NullableJsonNullValueInput | InputJsonValue
    twoFactorEnabledAt?: Date | string | null
    twoFactorOTP?: NullableJsonNullValueInput | InputJsonValue
    trustedDevices?: NullableJsonNullValueInput | InputJsonValue
    isActive?: boolean
    isEmailVerified?: boolean
    lastLoginAt?: Date | string | null
    loginAttempts?: number
    lockedUntil?: Date | string | null
    passwordResetToken?: string | null
    passwordResetTokenExpires?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    phoneCarrier?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    accountSetupToken?: NullableStringFieldUpdateOperationsInput | string | null
    accountSetupTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    twoFactorSecret?: NullableStringFieldUpdateOperationsInput | string | null
    twoFactorBackupCodes?: NullableJsonNullValueInput | InputJsonValue
    twoFactorEnabledAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    twoFactorOTP?: NullableJsonNullValueInput | InputJsonValue
    trustedDevices?: NullableJsonNullValueInput | InputJsonValue
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isEmailVerified?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    loginAttempts?: IntFieldUpdateOperationsInput | number
    lockedUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    passwordResetToken?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    organization?: OrganizationUpdateOneRequiredWithoutUsersNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    phoneCarrier?: NullableStringFieldUpdateOperationsInput | string | null
    organizationId?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    accountSetupToken?: NullableStringFieldUpdateOperationsInput | string | null
    accountSetupTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    twoFactorSecret?: NullableStringFieldUpdateOperationsInput | string | null
    twoFactorBackupCodes?: NullableJsonNullValueInput | InputJsonValue
    twoFactorEnabledAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    twoFactorOTP?: NullableJsonNullValueInput | InputJsonValue
    trustedDevices?: NullableJsonNullValueInput | InputJsonValue
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isEmailVerified?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    loginAttempts?: IntFieldUpdateOperationsInput | number
    lockedUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    passwordResetToken?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserCreateManyInput = {
    id?: string
    email: string
    password?: string | null
    firstName: string
    lastName: string
    phone?: string | null
    phoneCarrier?: string | null
    organizationId: string
    role?: string
    accountSetupToken?: string | null
    accountSetupTokenExpires?: Date | string | null
    twoFactorSecret?: string | null
    twoFactorBackupCodes?: NullableJsonNullValueInput | InputJsonValue
    twoFactorEnabledAt?: Date | string | null
    twoFactorOTP?: NullableJsonNullValueInput | InputJsonValue
    trustedDevices?: NullableJsonNullValueInput | InputJsonValue
    isActive?: boolean
    isEmailVerified?: boolean
    lastLoginAt?: Date | string | null
    loginAttempts?: number
    lockedUntil?: Date | string | null
    passwordResetToken?: string | null
    passwordResetTokenExpires?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    phoneCarrier?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    accountSetupToken?: NullableStringFieldUpdateOperationsInput | string | null
    accountSetupTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    twoFactorSecret?: NullableStringFieldUpdateOperationsInput | string | null
    twoFactorBackupCodes?: NullableJsonNullValueInput | InputJsonValue
    twoFactorEnabledAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    twoFactorOTP?: NullableJsonNullValueInput | InputJsonValue
    trustedDevices?: NullableJsonNullValueInput | InputJsonValue
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isEmailVerified?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    loginAttempts?: IntFieldUpdateOperationsInput | number
    lockedUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    passwordResetToken?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    phoneCarrier?: NullableStringFieldUpdateOperationsInput | string | null
    organizationId?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    accountSetupToken?: NullableStringFieldUpdateOperationsInput | string | null
    accountSetupTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    twoFactorSecret?: NullableStringFieldUpdateOperationsInput | string | null
    twoFactorBackupCodes?: NullableJsonNullValueInput | InputJsonValue
    twoFactorEnabledAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    twoFactorOTP?: NullableJsonNullValueInput | InputJsonValue
    trustedDevices?: NullableJsonNullValueInput | InputJsonValue
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isEmailVerified?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    loginAttempts?: IntFieldUpdateOperationsInput | number
    lockedUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    passwordResetToken?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PlatformAdminCreateInput = {
    id?: string
    email: string
    passwordHash: string
    firstName: string
    lastName: string
    role?: $Enums.AdminRole
    isActive?: boolean
    twoFactorSecret?: string | null
    twoFactorEnabled?: boolean
    twoFactorBackupCodes?: NullableJsonNullValueInput | InputJsonValue
    twoFactorOTP?: NullableJsonNullValueInput | InputJsonValue
    trustedDevices?: NullableJsonNullValueInput | InputJsonValue
    loginAttempts?: number
    lockedUntil?: Date | string | null
    lastLoginAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    auditLogs?: AdminAuditLogCreateNestedManyWithoutAdminInput
    sessions?: AdminSessionCreateNestedManyWithoutAdminInput
  }

  export type PlatformAdminUncheckedCreateInput = {
    id?: string
    email: string
    passwordHash: string
    firstName: string
    lastName: string
    role?: $Enums.AdminRole
    isActive?: boolean
    twoFactorSecret?: string | null
    twoFactorEnabled?: boolean
    twoFactorBackupCodes?: NullableJsonNullValueInput | InputJsonValue
    twoFactorOTP?: NullableJsonNullValueInput | InputJsonValue
    trustedDevices?: NullableJsonNullValueInput | InputJsonValue
    loginAttempts?: number
    lockedUntil?: Date | string | null
    lastLoginAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    auditLogs?: AdminAuditLogUncheckedCreateNestedManyWithoutAdminInput
    sessions?: AdminSessionUncheckedCreateNestedManyWithoutAdminInput
  }

  export type PlatformAdminUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    role?: EnumAdminRoleFieldUpdateOperationsInput | $Enums.AdminRole
    isActive?: BoolFieldUpdateOperationsInput | boolean
    twoFactorSecret?: NullableStringFieldUpdateOperationsInput | string | null
    twoFactorEnabled?: BoolFieldUpdateOperationsInput | boolean
    twoFactorBackupCodes?: NullableJsonNullValueInput | InputJsonValue
    twoFactorOTP?: NullableJsonNullValueInput | InputJsonValue
    trustedDevices?: NullableJsonNullValueInput | InputJsonValue
    loginAttempts?: IntFieldUpdateOperationsInput | number
    lockedUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    auditLogs?: AdminAuditLogUpdateManyWithoutAdminNestedInput
    sessions?: AdminSessionUpdateManyWithoutAdminNestedInput
  }

  export type PlatformAdminUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    role?: EnumAdminRoleFieldUpdateOperationsInput | $Enums.AdminRole
    isActive?: BoolFieldUpdateOperationsInput | boolean
    twoFactorSecret?: NullableStringFieldUpdateOperationsInput | string | null
    twoFactorEnabled?: BoolFieldUpdateOperationsInput | boolean
    twoFactorBackupCodes?: NullableJsonNullValueInput | InputJsonValue
    twoFactorOTP?: NullableJsonNullValueInput | InputJsonValue
    trustedDevices?: NullableJsonNullValueInput | InputJsonValue
    loginAttempts?: IntFieldUpdateOperationsInput | number
    lockedUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    auditLogs?: AdminAuditLogUncheckedUpdateManyWithoutAdminNestedInput
    sessions?: AdminSessionUncheckedUpdateManyWithoutAdminNestedInput
  }

  export type PlatformAdminCreateManyInput = {
    id?: string
    email: string
    passwordHash: string
    firstName: string
    lastName: string
    role?: $Enums.AdminRole
    isActive?: boolean
    twoFactorSecret?: string | null
    twoFactorEnabled?: boolean
    twoFactorBackupCodes?: NullableJsonNullValueInput | InputJsonValue
    twoFactorOTP?: NullableJsonNullValueInput | InputJsonValue
    trustedDevices?: NullableJsonNullValueInput | InputJsonValue
    loginAttempts?: number
    lockedUntil?: Date | string | null
    lastLoginAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PlatformAdminUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    role?: EnumAdminRoleFieldUpdateOperationsInput | $Enums.AdminRole
    isActive?: BoolFieldUpdateOperationsInput | boolean
    twoFactorSecret?: NullableStringFieldUpdateOperationsInput | string | null
    twoFactorEnabled?: BoolFieldUpdateOperationsInput | boolean
    twoFactorBackupCodes?: NullableJsonNullValueInput | InputJsonValue
    twoFactorOTP?: NullableJsonNullValueInput | InputJsonValue
    trustedDevices?: NullableJsonNullValueInput | InputJsonValue
    loginAttempts?: IntFieldUpdateOperationsInput | number
    lockedUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PlatformAdminUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    role?: EnumAdminRoleFieldUpdateOperationsInput | $Enums.AdminRole
    isActive?: BoolFieldUpdateOperationsInput | boolean
    twoFactorSecret?: NullableStringFieldUpdateOperationsInput | string | null
    twoFactorEnabled?: BoolFieldUpdateOperationsInput | boolean
    twoFactorBackupCodes?: NullableJsonNullValueInput | InputJsonValue
    twoFactorOTP?: NullableJsonNullValueInput | InputJsonValue
    trustedDevices?: NullableJsonNullValueInput | InputJsonValue
    loginAttempts?: IntFieldUpdateOperationsInput | number
    lockedUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AdminAuditLogCreateInput = {
    id?: string
    action: string
    resource?: string | null
    resourceType?: string | null
    details?: NullableJsonNullValueInput | InputJsonValue
    ipAddress: string
    userAgent?: string | null
    timestamp?: Date | string
    admin: PlatformAdminCreateNestedOneWithoutAuditLogsInput
  }

  export type AdminAuditLogUncheckedCreateInput = {
    id?: string
    adminId: string
    action: string
    resource?: string | null
    resourceType?: string | null
    details?: NullableJsonNullValueInput | InputJsonValue
    ipAddress: string
    userAgent?: string | null
    timestamp?: Date | string
  }

  export type AdminAuditLogUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    resource?: NullableStringFieldUpdateOperationsInput | string | null
    resourceType?: NullableStringFieldUpdateOperationsInput | string | null
    details?: NullableJsonNullValueInput | InputJsonValue
    ipAddress?: StringFieldUpdateOperationsInput | string
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    admin?: PlatformAdminUpdateOneRequiredWithoutAuditLogsNestedInput
  }

  export type AdminAuditLogUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    adminId?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    resource?: NullableStringFieldUpdateOperationsInput | string | null
    resourceType?: NullableStringFieldUpdateOperationsInput | string | null
    details?: NullableJsonNullValueInput | InputJsonValue
    ipAddress?: StringFieldUpdateOperationsInput | string
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AdminAuditLogCreateManyInput = {
    id?: string
    adminId: string
    action: string
    resource?: string | null
    resourceType?: string | null
    details?: NullableJsonNullValueInput | InputJsonValue
    ipAddress: string
    userAgent?: string | null
    timestamp?: Date | string
  }

  export type AdminAuditLogUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    resource?: NullableStringFieldUpdateOperationsInput | string | null
    resourceType?: NullableStringFieldUpdateOperationsInput | string | null
    details?: NullableJsonNullValueInput | InputJsonValue
    ipAddress?: StringFieldUpdateOperationsInput | string
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AdminAuditLogUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    adminId?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    resource?: NullableStringFieldUpdateOperationsInput | string | null
    resourceType?: NullableStringFieldUpdateOperationsInput | string | null
    details?: NullableJsonNullValueInput | InputJsonValue
    ipAddress?: StringFieldUpdateOperationsInput | string
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SystemConfigCreateInput = {
    id?: string
    key: string
    value: JsonNullValueInput | InputJsonValue
    description?: string | null
    updatedBy?: string | null
    updatedAt?: Date | string
    createdAt?: Date | string
  }

  export type SystemConfigUncheckedCreateInput = {
    id?: string
    key: string
    value: JsonNullValueInput | InputJsonValue
    description?: string | null
    updatedBy?: string | null
    updatedAt?: Date | string
    createdAt?: Date | string
  }

  export type SystemConfigUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    value?: JsonNullValueInput | InputJsonValue
    description?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SystemConfigUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    value?: JsonNullValueInput | InputJsonValue
    description?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SystemConfigCreateManyInput = {
    id?: string
    key: string
    value: JsonNullValueInput | InputJsonValue
    description?: string | null
    updatedBy?: string | null
    updatedAt?: Date | string
    createdAt?: Date | string
  }

  export type SystemConfigUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    value?: JsonNullValueInput | InputJsonValue
    description?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SystemConfigUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    value?: JsonNullValueInput | InputJsonValue
    description?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AdminSessionCreateInput = {
    id?: string
    token: string
    expiresAt: Date | string
    ipAddress?: string | null
    userAgent?: string | null
    isActive?: boolean
    createdAt?: Date | string
    admin: PlatformAdminCreateNestedOneWithoutSessionsInput
  }

  export type AdminSessionUncheckedCreateInput = {
    id?: string
    adminId: string
    token: string
    expiresAt: Date | string
    ipAddress?: string | null
    userAgent?: string | null
    isActive?: boolean
    createdAt?: Date | string
  }

  export type AdminSessionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    admin?: PlatformAdminUpdateOneRequiredWithoutSessionsNestedInput
  }

  export type AdminSessionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    adminId?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AdminSessionCreateManyInput = {
    id?: string
    adminId: string
    token: string
    expiresAt: Date | string
    ipAddress?: string | null
    userAgent?: string | null
    isActive?: boolean
    createdAt?: Date | string
  }

  export type AdminSessionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AdminSessionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    adminId?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SubscriptionCreateInput = {
    id?: string
    stripeSubscriptionId?: string | null
    stripePriceId?: string | null
    plan: $Enums.SubscriptionPlan
    status: $Enums.SubscriptionStatus
    currentPeriodStart: Date | string
    currentPeriodEnd: Date | string
    trialStart?: Date | string | null
    trialEnd?: Date | string | null
    canceledAt?: Date | string | null
    cancelAtPeriodEnd?: boolean
    monthlyRevenue?: Decimal | DecimalJsLike | number | string | null
    yearlyRevenue?: Decimal | DecimalJsLike | number | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    organization: OrganizationCreateNestedOneWithoutSubscriptionsInput
    billingEvents?: BillingEventCreateNestedManyWithoutSubscriptionInput
  }

  export type SubscriptionUncheckedCreateInput = {
    id?: string
    organizationId: string
    stripeSubscriptionId?: string | null
    stripePriceId?: string | null
    plan: $Enums.SubscriptionPlan
    status: $Enums.SubscriptionStatus
    currentPeriodStart: Date | string
    currentPeriodEnd: Date | string
    trialStart?: Date | string | null
    trialEnd?: Date | string | null
    canceledAt?: Date | string | null
    cancelAtPeriodEnd?: boolean
    monthlyRevenue?: Decimal | DecimalJsLike | number | string | null
    yearlyRevenue?: Decimal | DecimalJsLike | number | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    billingEvents?: BillingEventUncheckedCreateNestedManyWithoutSubscriptionInput
  }

  export type SubscriptionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    stripeSubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    stripePriceId?: NullableStringFieldUpdateOperationsInput | string | null
    plan?: EnumSubscriptionPlanFieldUpdateOperationsInput | $Enums.SubscriptionPlan
    status?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    currentPeriodStart?: DateTimeFieldUpdateOperationsInput | Date | string
    currentPeriodEnd?: DateTimeFieldUpdateOperationsInput | Date | string
    trialStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    trialEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    canceledAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelAtPeriodEnd?: BoolFieldUpdateOperationsInput | boolean
    monthlyRevenue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    yearlyRevenue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    organization?: OrganizationUpdateOneRequiredWithoutSubscriptionsNestedInput
    billingEvents?: BillingEventUpdateManyWithoutSubscriptionNestedInput
  }

  export type SubscriptionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    organizationId?: StringFieldUpdateOperationsInput | string
    stripeSubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    stripePriceId?: NullableStringFieldUpdateOperationsInput | string | null
    plan?: EnumSubscriptionPlanFieldUpdateOperationsInput | $Enums.SubscriptionPlan
    status?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    currentPeriodStart?: DateTimeFieldUpdateOperationsInput | Date | string
    currentPeriodEnd?: DateTimeFieldUpdateOperationsInput | Date | string
    trialStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    trialEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    canceledAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelAtPeriodEnd?: BoolFieldUpdateOperationsInput | boolean
    monthlyRevenue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    yearlyRevenue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    billingEvents?: BillingEventUncheckedUpdateManyWithoutSubscriptionNestedInput
  }

  export type SubscriptionCreateManyInput = {
    id?: string
    organizationId: string
    stripeSubscriptionId?: string | null
    stripePriceId?: string | null
    plan: $Enums.SubscriptionPlan
    status: $Enums.SubscriptionStatus
    currentPeriodStart: Date | string
    currentPeriodEnd: Date | string
    trialStart?: Date | string | null
    trialEnd?: Date | string | null
    canceledAt?: Date | string | null
    cancelAtPeriodEnd?: boolean
    monthlyRevenue?: Decimal | DecimalJsLike | number | string | null
    yearlyRevenue?: Decimal | DecimalJsLike | number | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SubscriptionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    stripeSubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    stripePriceId?: NullableStringFieldUpdateOperationsInput | string | null
    plan?: EnumSubscriptionPlanFieldUpdateOperationsInput | $Enums.SubscriptionPlan
    status?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    currentPeriodStart?: DateTimeFieldUpdateOperationsInput | Date | string
    currentPeriodEnd?: DateTimeFieldUpdateOperationsInput | Date | string
    trialStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    trialEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    canceledAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelAtPeriodEnd?: BoolFieldUpdateOperationsInput | boolean
    monthlyRevenue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    yearlyRevenue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SubscriptionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    organizationId?: StringFieldUpdateOperationsInput | string
    stripeSubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    stripePriceId?: NullableStringFieldUpdateOperationsInput | string | null
    plan?: EnumSubscriptionPlanFieldUpdateOperationsInput | $Enums.SubscriptionPlan
    status?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    currentPeriodStart?: DateTimeFieldUpdateOperationsInput | Date | string
    currentPeriodEnd?: DateTimeFieldUpdateOperationsInput | Date | string
    trialStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    trialEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    canceledAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelAtPeriodEnd?: BoolFieldUpdateOperationsInput | boolean
    monthlyRevenue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    yearlyRevenue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BillingEventCreateInput = {
    id?: string
    stripeEventId?: string | null
    eventType: $Enums.BillingEventType
    amount?: Decimal | DecimalJsLike | number | string | null
    currency?: string | null
    description?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    processedAt?: Date | string | null
    createdAt?: Date | string
    organization: OrganizationCreateNestedOneWithoutBillingEventsInput
    subscription?: SubscriptionCreateNestedOneWithoutBillingEventsInput
  }

  export type BillingEventUncheckedCreateInput = {
    id?: string
    organizationId: string
    subscriptionId?: string | null
    stripeEventId?: string | null
    eventType: $Enums.BillingEventType
    amount?: Decimal | DecimalJsLike | number | string | null
    currency?: string | null
    description?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    processedAt?: Date | string | null
    createdAt?: Date | string
  }

  export type BillingEventUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    stripeEventId?: NullableStringFieldUpdateOperationsInput | string | null
    eventType?: EnumBillingEventTypeFieldUpdateOperationsInput | $Enums.BillingEventType
    amount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    organization?: OrganizationUpdateOneRequiredWithoutBillingEventsNestedInput
    subscription?: SubscriptionUpdateOneWithoutBillingEventsNestedInput
  }

  export type BillingEventUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    organizationId?: StringFieldUpdateOperationsInput | string
    subscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    stripeEventId?: NullableStringFieldUpdateOperationsInput | string | null
    eventType?: EnumBillingEventTypeFieldUpdateOperationsInput | $Enums.BillingEventType
    amount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BillingEventCreateManyInput = {
    id?: string
    organizationId: string
    subscriptionId?: string | null
    stripeEventId?: string | null
    eventType: $Enums.BillingEventType
    amount?: Decimal | DecimalJsLike | number | string | null
    currency?: string | null
    description?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    processedAt?: Date | string | null
    createdAt?: Date | string
  }

  export type BillingEventUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    stripeEventId?: NullableStringFieldUpdateOperationsInput | string | null
    eventType?: EnumBillingEventTypeFieldUpdateOperationsInput | $Enums.BillingEventType
    amount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BillingEventUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    organizationId?: StringFieldUpdateOperationsInput | string
    subscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    stripeEventId?: NullableStringFieldUpdateOperationsInput | string | null
    eventType?: EnumBillingEventTypeFieldUpdateOperationsInput | $Enums.BillingEventType
    amount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RevenueMetricCreateInput = {
    id?: string
    date: Date | string
    period: $Enums.MetricPeriod
    totalRevenue: Decimal | DecimalJsLike | number | string
    newRevenue: Decimal | DecimalJsLike | number | string
    churnedRevenue: Decimal | DecimalJsLike | number | string
    upgradeRevenue: Decimal | DecimalJsLike | number | string
    downgradeRevenue: Decimal | DecimalJsLike | number | string
    activeSubscriptions: number
    trialSubscriptions: number
    churnedSubscriptions: number
    newSubscriptions: number
    churnRate?: Decimal | DecimalJsLike | number | string | null
    growthRate?: Decimal | DecimalJsLike | number | string | null
    createdAt?: Date | string
  }

  export type RevenueMetricUncheckedCreateInput = {
    id?: string
    date: Date | string
    period: $Enums.MetricPeriod
    totalRevenue: Decimal | DecimalJsLike | number | string
    newRevenue: Decimal | DecimalJsLike | number | string
    churnedRevenue: Decimal | DecimalJsLike | number | string
    upgradeRevenue: Decimal | DecimalJsLike | number | string
    downgradeRevenue: Decimal | DecimalJsLike | number | string
    activeSubscriptions: number
    trialSubscriptions: number
    churnedSubscriptions: number
    newSubscriptions: number
    churnRate?: Decimal | DecimalJsLike | number | string | null
    growthRate?: Decimal | DecimalJsLike | number | string | null
    createdAt?: Date | string
  }

  export type RevenueMetricUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    period?: EnumMetricPeriodFieldUpdateOperationsInput | $Enums.MetricPeriod
    totalRevenue?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    newRevenue?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    churnedRevenue?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    upgradeRevenue?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    downgradeRevenue?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    activeSubscriptions?: IntFieldUpdateOperationsInput | number
    trialSubscriptions?: IntFieldUpdateOperationsInput | number
    churnedSubscriptions?: IntFieldUpdateOperationsInput | number
    newSubscriptions?: IntFieldUpdateOperationsInput | number
    churnRate?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    growthRate?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RevenueMetricUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    period?: EnumMetricPeriodFieldUpdateOperationsInput | $Enums.MetricPeriod
    totalRevenue?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    newRevenue?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    churnedRevenue?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    upgradeRevenue?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    downgradeRevenue?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    activeSubscriptions?: IntFieldUpdateOperationsInput | number
    trialSubscriptions?: IntFieldUpdateOperationsInput | number
    churnedSubscriptions?: IntFieldUpdateOperationsInput | number
    newSubscriptions?: IntFieldUpdateOperationsInput | number
    churnRate?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    growthRate?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RevenueMetricCreateManyInput = {
    id?: string
    date: Date | string
    period: $Enums.MetricPeriod
    totalRevenue: Decimal | DecimalJsLike | number | string
    newRevenue: Decimal | DecimalJsLike | number | string
    churnedRevenue: Decimal | DecimalJsLike | number | string
    upgradeRevenue: Decimal | DecimalJsLike | number | string
    downgradeRevenue: Decimal | DecimalJsLike | number | string
    activeSubscriptions: number
    trialSubscriptions: number
    churnedSubscriptions: number
    newSubscriptions: number
    churnRate?: Decimal | DecimalJsLike | number | string | null
    growthRate?: Decimal | DecimalJsLike | number | string | null
    createdAt?: Date | string
  }

  export type RevenueMetricUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    period?: EnumMetricPeriodFieldUpdateOperationsInput | $Enums.MetricPeriod
    totalRevenue?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    newRevenue?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    churnedRevenue?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    upgradeRevenue?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    downgradeRevenue?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    activeSubscriptions?: IntFieldUpdateOperationsInput | number
    trialSubscriptions?: IntFieldUpdateOperationsInput | number
    churnedSubscriptions?: IntFieldUpdateOperationsInput | number
    newSubscriptions?: IntFieldUpdateOperationsInput | number
    churnRate?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    growthRate?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RevenueMetricUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    period?: EnumMetricPeriodFieldUpdateOperationsInput | $Enums.MetricPeriod
    totalRevenue?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    newRevenue?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    churnedRevenue?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    upgradeRevenue?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    downgradeRevenue?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    activeSubscriptions?: IntFieldUpdateOperationsInput | number
    trialSubscriptions?: IntFieldUpdateOperationsInput | number
    churnedSubscriptions?: IntFieldUpdateOperationsInput | number
    newSubscriptions?: IntFieldUpdateOperationsInput | number
    churnRate?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    growthRate?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StripeConfigCreateInput = {
    id?: string
    isLive?: boolean
    publishableKey?: string | null
    webhookSecret?: string | null
    defaultCurrency?: string
    taxRateId?: string | null
    updatedBy: string
    updatedAt?: Date | string
    createdAt?: Date | string
  }

  export type StripeConfigUncheckedCreateInput = {
    id?: string
    isLive?: boolean
    publishableKey?: string | null
    webhookSecret?: string | null
    defaultCurrency?: string
    taxRateId?: string | null
    updatedBy: string
    updatedAt?: Date | string
    createdAt?: Date | string
  }

  export type StripeConfigUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    isLive?: BoolFieldUpdateOperationsInput | boolean
    publishableKey?: NullableStringFieldUpdateOperationsInput | string | null
    webhookSecret?: NullableStringFieldUpdateOperationsInput | string | null
    defaultCurrency?: StringFieldUpdateOperationsInput | string
    taxRateId?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: StringFieldUpdateOperationsInput | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StripeConfigUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    isLive?: BoolFieldUpdateOperationsInput | boolean
    publishableKey?: NullableStringFieldUpdateOperationsInput | string | null
    webhookSecret?: NullableStringFieldUpdateOperationsInput | string | null
    defaultCurrency?: StringFieldUpdateOperationsInput | string
    taxRateId?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: StringFieldUpdateOperationsInput | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StripeConfigCreateManyInput = {
    id?: string
    isLive?: boolean
    publishableKey?: string | null
    webhookSecret?: string | null
    defaultCurrency?: string
    taxRateId?: string | null
    updatedBy: string
    updatedAt?: Date | string
    createdAt?: Date | string
  }

  export type StripeConfigUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    isLive?: BoolFieldUpdateOperationsInput | boolean
    publishableKey?: NullableStringFieldUpdateOperationsInput | string | null
    webhookSecret?: NullableStringFieldUpdateOperationsInput | string | null
    defaultCurrency?: StringFieldUpdateOperationsInput | string
    taxRateId?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: StringFieldUpdateOperationsInput | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StripeConfigUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    isLive?: BoolFieldUpdateOperationsInput | boolean
    publishableKey?: NullableStringFieldUpdateOperationsInput | string | null
    webhookSecret?: NullableStringFieldUpdateOperationsInput | string | null
    defaultCurrency?: StringFieldUpdateOperationsInput | string
    taxRateId?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: StringFieldUpdateOperationsInput | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }
  export type JsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type UserListRelationFilter = {
    every?: UserWhereInput
    some?: UserWhereInput
    none?: UserWhereInput
  }

  export type SubscriptionListRelationFilter = {
    every?: SubscriptionWhereInput
    some?: SubscriptionWhereInput
    none?: SubscriptionWhereInput
  }

  export type BillingEventListRelationFilter = {
    every?: BillingEventWhereInput
    some?: BillingEventWhereInput
    none?: BillingEventWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type UserOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type SubscriptionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type BillingEventOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type OrganizationCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    slug?: SortOrder
    isActive?: SortOrder
    settings?: SortOrder
    stripeCustomerId?: SortOrder
    billingEmail?: SortOrder
    trialEndsAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type OrganizationMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    slug?: SortOrder
    isActive?: SortOrder
    stripeCustomerId?: SortOrder
    billingEmail?: SortOrder
    trialEndsAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type OrganizationMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    slug?: SortOrder
    isActive?: SortOrder
    stripeCustomerId?: SortOrder
    billingEmail?: SortOrder
    trialEndsAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }
  export type JsonNullableWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedJsonNullableFilter<$PrismaModel>
    _max?: NestedJsonNullableFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type OrganizationScalarRelationFilter = {
    is?: OrganizationWhereInput
    isNot?: OrganizationWhereInput
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    password?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    phone?: SortOrder
    phoneCarrier?: SortOrder
    organizationId?: SortOrder
    role?: SortOrder
    accountSetupToken?: SortOrder
    accountSetupTokenExpires?: SortOrder
    twoFactorSecret?: SortOrder
    twoFactorBackupCodes?: SortOrder
    twoFactorEnabledAt?: SortOrder
    twoFactorOTP?: SortOrder
    trustedDevices?: SortOrder
    isActive?: SortOrder
    isEmailVerified?: SortOrder
    lastLoginAt?: SortOrder
    loginAttempts?: SortOrder
    lockedUntil?: SortOrder
    passwordResetToken?: SortOrder
    passwordResetTokenExpires?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserAvgOrderByAggregateInput = {
    loginAttempts?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    password?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    phone?: SortOrder
    phoneCarrier?: SortOrder
    organizationId?: SortOrder
    role?: SortOrder
    accountSetupToken?: SortOrder
    accountSetupTokenExpires?: SortOrder
    twoFactorSecret?: SortOrder
    twoFactorEnabledAt?: SortOrder
    isActive?: SortOrder
    isEmailVerified?: SortOrder
    lastLoginAt?: SortOrder
    loginAttempts?: SortOrder
    lockedUntil?: SortOrder
    passwordResetToken?: SortOrder
    passwordResetTokenExpires?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    password?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    phone?: SortOrder
    phoneCarrier?: SortOrder
    organizationId?: SortOrder
    role?: SortOrder
    accountSetupToken?: SortOrder
    accountSetupTokenExpires?: SortOrder
    twoFactorSecret?: SortOrder
    twoFactorEnabledAt?: SortOrder
    isActive?: SortOrder
    isEmailVerified?: SortOrder
    lastLoginAt?: SortOrder
    loginAttempts?: SortOrder
    lockedUntil?: SortOrder
    passwordResetToken?: SortOrder
    passwordResetTokenExpires?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserSumOrderByAggregateInput = {
    loginAttempts?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type EnumAdminRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.AdminRole | EnumAdminRoleFieldRefInput<$PrismaModel>
    in?: $Enums.AdminRole[] | ListEnumAdminRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.AdminRole[] | ListEnumAdminRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumAdminRoleFilter<$PrismaModel> | $Enums.AdminRole
  }

  export type AdminAuditLogListRelationFilter = {
    every?: AdminAuditLogWhereInput
    some?: AdminAuditLogWhereInput
    none?: AdminAuditLogWhereInput
  }

  export type AdminSessionListRelationFilter = {
    every?: AdminSessionWhereInput
    some?: AdminSessionWhereInput
    none?: AdminSessionWhereInput
  }

  export type AdminAuditLogOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AdminSessionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type PlatformAdminCountOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    passwordHash?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    role?: SortOrder
    isActive?: SortOrder
    twoFactorSecret?: SortOrder
    twoFactorEnabled?: SortOrder
    twoFactorBackupCodes?: SortOrder
    twoFactorOTP?: SortOrder
    trustedDevices?: SortOrder
    loginAttempts?: SortOrder
    lockedUntil?: SortOrder
    lastLoginAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PlatformAdminAvgOrderByAggregateInput = {
    loginAttempts?: SortOrder
  }

  export type PlatformAdminMaxOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    passwordHash?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    role?: SortOrder
    isActive?: SortOrder
    twoFactorSecret?: SortOrder
    twoFactorEnabled?: SortOrder
    loginAttempts?: SortOrder
    lockedUntil?: SortOrder
    lastLoginAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PlatformAdminMinOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    passwordHash?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    role?: SortOrder
    isActive?: SortOrder
    twoFactorSecret?: SortOrder
    twoFactorEnabled?: SortOrder
    loginAttempts?: SortOrder
    lockedUntil?: SortOrder
    lastLoginAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PlatformAdminSumOrderByAggregateInput = {
    loginAttempts?: SortOrder
  }

  export type EnumAdminRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AdminRole | EnumAdminRoleFieldRefInput<$PrismaModel>
    in?: $Enums.AdminRole[] | ListEnumAdminRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.AdminRole[] | ListEnumAdminRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumAdminRoleWithAggregatesFilter<$PrismaModel> | $Enums.AdminRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAdminRoleFilter<$PrismaModel>
    _max?: NestedEnumAdminRoleFilter<$PrismaModel>
  }

  export type PlatformAdminScalarRelationFilter = {
    is?: PlatformAdminWhereInput
    isNot?: PlatformAdminWhereInput
  }

  export type AdminAuditLogCountOrderByAggregateInput = {
    id?: SortOrder
    adminId?: SortOrder
    action?: SortOrder
    resource?: SortOrder
    resourceType?: SortOrder
    details?: SortOrder
    ipAddress?: SortOrder
    userAgent?: SortOrder
    timestamp?: SortOrder
  }

  export type AdminAuditLogMaxOrderByAggregateInput = {
    id?: SortOrder
    adminId?: SortOrder
    action?: SortOrder
    resource?: SortOrder
    resourceType?: SortOrder
    ipAddress?: SortOrder
    userAgent?: SortOrder
    timestamp?: SortOrder
  }

  export type AdminAuditLogMinOrderByAggregateInput = {
    id?: SortOrder
    adminId?: SortOrder
    action?: SortOrder
    resource?: SortOrder
    resourceType?: SortOrder
    ipAddress?: SortOrder
    userAgent?: SortOrder
    timestamp?: SortOrder
  }
  export type JsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type SystemConfigCountOrderByAggregateInput = {
    id?: SortOrder
    key?: SortOrder
    value?: SortOrder
    description?: SortOrder
    updatedBy?: SortOrder
    updatedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type SystemConfigMaxOrderByAggregateInput = {
    id?: SortOrder
    key?: SortOrder
    description?: SortOrder
    updatedBy?: SortOrder
    updatedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type SystemConfigMinOrderByAggregateInput = {
    id?: SortOrder
    key?: SortOrder
    description?: SortOrder
    updatedBy?: SortOrder
    updatedAt?: SortOrder
    createdAt?: SortOrder
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type AdminSessionCountOrderByAggregateInput = {
    id?: SortOrder
    adminId?: SortOrder
    token?: SortOrder
    expiresAt?: SortOrder
    ipAddress?: SortOrder
    userAgent?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
  }

  export type AdminSessionMaxOrderByAggregateInput = {
    id?: SortOrder
    adminId?: SortOrder
    token?: SortOrder
    expiresAt?: SortOrder
    ipAddress?: SortOrder
    userAgent?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
  }

  export type AdminSessionMinOrderByAggregateInput = {
    id?: SortOrder
    adminId?: SortOrder
    token?: SortOrder
    expiresAt?: SortOrder
    ipAddress?: SortOrder
    userAgent?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
  }

  export type EnumSubscriptionPlanFilter<$PrismaModel = never> = {
    equals?: $Enums.SubscriptionPlan | EnumSubscriptionPlanFieldRefInput<$PrismaModel>
    in?: $Enums.SubscriptionPlan[] | ListEnumSubscriptionPlanFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubscriptionPlan[] | ListEnumSubscriptionPlanFieldRefInput<$PrismaModel>
    not?: NestedEnumSubscriptionPlanFilter<$PrismaModel> | $Enums.SubscriptionPlan
  }

  export type EnumSubscriptionStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.SubscriptionStatus | EnumSubscriptionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSubscriptionStatusFilter<$PrismaModel> | $Enums.SubscriptionStatus
  }

  export type DecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type SubscriptionCountOrderByAggregateInput = {
    id?: SortOrder
    organizationId?: SortOrder
    stripeSubscriptionId?: SortOrder
    stripePriceId?: SortOrder
    plan?: SortOrder
    status?: SortOrder
    currentPeriodStart?: SortOrder
    currentPeriodEnd?: SortOrder
    trialStart?: SortOrder
    trialEnd?: SortOrder
    canceledAt?: SortOrder
    cancelAtPeriodEnd?: SortOrder
    monthlyRevenue?: SortOrder
    yearlyRevenue?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SubscriptionAvgOrderByAggregateInput = {
    monthlyRevenue?: SortOrder
    yearlyRevenue?: SortOrder
  }

  export type SubscriptionMaxOrderByAggregateInput = {
    id?: SortOrder
    organizationId?: SortOrder
    stripeSubscriptionId?: SortOrder
    stripePriceId?: SortOrder
    plan?: SortOrder
    status?: SortOrder
    currentPeriodStart?: SortOrder
    currentPeriodEnd?: SortOrder
    trialStart?: SortOrder
    trialEnd?: SortOrder
    canceledAt?: SortOrder
    cancelAtPeriodEnd?: SortOrder
    monthlyRevenue?: SortOrder
    yearlyRevenue?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SubscriptionMinOrderByAggregateInput = {
    id?: SortOrder
    organizationId?: SortOrder
    stripeSubscriptionId?: SortOrder
    stripePriceId?: SortOrder
    plan?: SortOrder
    status?: SortOrder
    currentPeriodStart?: SortOrder
    currentPeriodEnd?: SortOrder
    trialStart?: SortOrder
    trialEnd?: SortOrder
    canceledAt?: SortOrder
    cancelAtPeriodEnd?: SortOrder
    monthlyRevenue?: SortOrder
    yearlyRevenue?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SubscriptionSumOrderByAggregateInput = {
    monthlyRevenue?: SortOrder
    yearlyRevenue?: SortOrder
  }

  export type EnumSubscriptionPlanWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SubscriptionPlan | EnumSubscriptionPlanFieldRefInput<$PrismaModel>
    in?: $Enums.SubscriptionPlan[] | ListEnumSubscriptionPlanFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubscriptionPlan[] | ListEnumSubscriptionPlanFieldRefInput<$PrismaModel>
    not?: NestedEnumSubscriptionPlanWithAggregatesFilter<$PrismaModel> | $Enums.SubscriptionPlan
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSubscriptionPlanFilter<$PrismaModel>
    _max?: NestedEnumSubscriptionPlanFilter<$PrismaModel>
  }

  export type EnumSubscriptionStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SubscriptionStatus | EnumSubscriptionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSubscriptionStatusWithAggregatesFilter<$PrismaModel> | $Enums.SubscriptionStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSubscriptionStatusFilter<$PrismaModel>
    _max?: NestedEnumSubscriptionStatusFilter<$PrismaModel>
  }

  export type DecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }

  export type EnumBillingEventTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.BillingEventType | EnumBillingEventTypeFieldRefInput<$PrismaModel>
    in?: $Enums.BillingEventType[] | ListEnumBillingEventTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.BillingEventType[] | ListEnumBillingEventTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumBillingEventTypeFilter<$PrismaModel> | $Enums.BillingEventType
  }

  export type SubscriptionNullableScalarRelationFilter = {
    is?: SubscriptionWhereInput | null
    isNot?: SubscriptionWhereInput | null
  }

  export type BillingEventCountOrderByAggregateInput = {
    id?: SortOrder
    organizationId?: SortOrder
    subscriptionId?: SortOrder
    stripeEventId?: SortOrder
    eventType?: SortOrder
    amount?: SortOrder
    currency?: SortOrder
    description?: SortOrder
    metadata?: SortOrder
    processedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type BillingEventAvgOrderByAggregateInput = {
    amount?: SortOrder
  }

  export type BillingEventMaxOrderByAggregateInput = {
    id?: SortOrder
    organizationId?: SortOrder
    subscriptionId?: SortOrder
    stripeEventId?: SortOrder
    eventType?: SortOrder
    amount?: SortOrder
    currency?: SortOrder
    description?: SortOrder
    processedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type BillingEventMinOrderByAggregateInput = {
    id?: SortOrder
    organizationId?: SortOrder
    subscriptionId?: SortOrder
    stripeEventId?: SortOrder
    eventType?: SortOrder
    amount?: SortOrder
    currency?: SortOrder
    description?: SortOrder
    processedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type BillingEventSumOrderByAggregateInput = {
    amount?: SortOrder
  }

  export type EnumBillingEventTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.BillingEventType | EnumBillingEventTypeFieldRefInput<$PrismaModel>
    in?: $Enums.BillingEventType[] | ListEnumBillingEventTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.BillingEventType[] | ListEnumBillingEventTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumBillingEventTypeWithAggregatesFilter<$PrismaModel> | $Enums.BillingEventType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumBillingEventTypeFilter<$PrismaModel>
    _max?: NestedEnumBillingEventTypeFilter<$PrismaModel>
  }

  export type EnumMetricPeriodFilter<$PrismaModel = never> = {
    equals?: $Enums.MetricPeriod | EnumMetricPeriodFieldRefInput<$PrismaModel>
    in?: $Enums.MetricPeriod[] | ListEnumMetricPeriodFieldRefInput<$PrismaModel>
    notIn?: $Enums.MetricPeriod[] | ListEnumMetricPeriodFieldRefInput<$PrismaModel>
    not?: NestedEnumMetricPeriodFilter<$PrismaModel> | $Enums.MetricPeriod
  }

  export type DecimalFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
  }

  export type RevenueMetricDatePeriodCompoundUniqueInput = {
    date: Date | string
    period: $Enums.MetricPeriod
  }

  export type RevenueMetricCountOrderByAggregateInput = {
    id?: SortOrder
    date?: SortOrder
    period?: SortOrder
    totalRevenue?: SortOrder
    newRevenue?: SortOrder
    churnedRevenue?: SortOrder
    upgradeRevenue?: SortOrder
    downgradeRevenue?: SortOrder
    activeSubscriptions?: SortOrder
    trialSubscriptions?: SortOrder
    churnedSubscriptions?: SortOrder
    newSubscriptions?: SortOrder
    churnRate?: SortOrder
    growthRate?: SortOrder
    createdAt?: SortOrder
  }

  export type RevenueMetricAvgOrderByAggregateInput = {
    totalRevenue?: SortOrder
    newRevenue?: SortOrder
    churnedRevenue?: SortOrder
    upgradeRevenue?: SortOrder
    downgradeRevenue?: SortOrder
    activeSubscriptions?: SortOrder
    trialSubscriptions?: SortOrder
    churnedSubscriptions?: SortOrder
    newSubscriptions?: SortOrder
    churnRate?: SortOrder
    growthRate?: SortOrder
  }

  export type RevenueMetricMaxOrderByAggregateInput = {
    id?: SortOrder
    date?: SortOrder
    period?: SortOrder
    totalRevenue?: SortOrder
    newRevenue?: SortOrder
    churnedRevenue?: SortOrder
    upgradeRevenue?: SortOrder
    downgradeRevenue?: SortOrder
    activeSubscriptions?: SortOrder
    trialSubscriptions?: SortOrder
    churnedSubscriptions?: SortOrder
    newSubscriptions?: SortOrder
    churnRate?: SortOrder
    growthRate?: SortOrder
    createdAt?: SortOrder
  }

  export type RevenueMetricMinOrderByAggregateInput = {
    id?: SortOrder
    date?: SortOrder
    period?: SortOrder
    totalRevenue?: SortOrder
    newRevenue?: SortOrder
    churnedRevenue?: SortOrder
    upgradeRevenue?: SortOrder
    downgradeRevenue?: SortOrder
    activeSubscriptions?: SortOrder
    trialSubscriptions?: SortOrder
    churnedSubscriptions?: SortOrder
    newSubscriptions?: SortOrder
    churnRate?: SortOrder
    growthRate?: SortOrder
    createdAt?: SortOrder
  }

  export type RevenueMetricSumOrderByAggregateInput = {
    totalRevenue?: SortOrder
    newRevenue?: SortOrder
    churnedRevenue?: SortOrder
    upgradeRevenue?: SortOrder
    downgradeRevenue?: SortOrder
    activeSubscriptions?: SortOrder
    trialSubscriptions?: SortOrder
    churnedSubscriptions?: SortOrder
    newSubscriptions?: SortOrder
    churnRate?: SortOrder
    growthRate?: SortOrder
  }

  export type EnumMetricPeriodWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.MetricPeriod | EnumMetricPeriodFieldRefInput<$PrismaModel>
    in?: $Enums.MetricPeriod[] | ListEnumMetricPeriodFieldRefInput<$PrismaModel>
    notIn?: $Enums.MetricPeriod[] | ListEnumMetricPeriodFieldRefInput<$PrismaModel>
    not?: NestedEnumMetricPeriodWithAggregatesFilter<$PrismaModel> | $Enums.MetricPeriod
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumMetricPeriodFilter<$PrismaModel>
    _max?: NestedEnumMetricPeriodFilter<$PrismaModel>
  }

  export type DecimalWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedDecimalFilter<$PrismaModel>
    _sum?: NestedDecimalFilter<$PrismaModel>
    _min?: NestedDecimalFilter<$PrismaModel>
    _max?: NestedDecimalFilter<$PrismaModel>
  }

  export type StripeConfigCountOrderByAggregateInput = {
    id?: SortOrder
    isLive?: SortOrder
    publishableKey?: SortOrder
    webhookSecret?: SortOrder
    defaultCurrency?: SortOrder
    taxRateId?: SortOrder
    updatedBy?: SortOrder
    updatedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type StripeConfigMaxOrderByAggregateInput = {
    id?: SortOrder
    isLive?: SortOrder
    publishableKey?: SortOrder
    webhookSecret?: SortOrder
    defaultCurrency?: SortOrder
    taxRateId?: SortOrder
    updatedBy?: SortOrder
    updatedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type StripeConfigMinOrderByAggregateInput = {
    id?: SortOrder
    isLive?: SortOrder
    publishableKey?: SortOrder
    webhookSecret?: SortOrder
    defaultCurrency?: SortOrder
    taxRateId?: SortOrder
    updatedBy?: SortOrder
    updatedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type UserCreateNestedManyWithoutOrganizationInput = {
    create?: XOR<UserCreateWithoutOrganizationInput, UserUncheckedCreateWithoutOrganizationInput> | UserCreateWithoutOrganizationInput[] | UserUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: UserCreateOrConnectWithoutOrganizationInput | UserCreateOrConnectWithoutOrganizationInput[]
    createMany?: UserCreateManyOrganizationInputEnvelope
    connect?: UserWhereUniqueInput | UserWhereUniqueInput[]
  }

  export type SubscriptionCreateNestedManyWithoutOrganizationInput = {
    create?: XOR<SubscriptionCreateWithoutOrganizationInput, SubscriptionUncheckedCreateWithoutOrganizationInput> | SubscriptionCreateWithoutOrganizationInput[] | SubscriptionUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: SubscriptionCreateOrConnectWithoutOrganizationInput | SubscriptionCreateOrConnectWithoutOrganizationInput[]
    createMany?: SubscriptionCreateManyOrganizationInputEnvelope
    connect?: SubscriptionWhereUniqueInput | SubscriptionWhereUniqueInput[]
  }

  export type BillingEventCreateNestedManyWithoutOrganizationInput = {
    create?: XOR<BillingEventCreateWithoutOrganizationInput, BillingEventUncheckedCreateWithoutOrganizationInput> | BillingEventCreateWithoutOrganizationInput[] | BillingEventUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: BillingEventCreateOrConnectWithoutOrganizationInput | BillingEventCreateOrConnectWithoutOrganizationInput[]
    createMany?: BillingEventCreateManyOrganizationInputEnvelope
    connect?: BillingEventWhereUniqueInput | BillingEventWhereUniqueInput[]
  }

  export type UserUncheckedCreateNestedManyWithoutOrganizationInput = {
    create?: XOR<UserCreateWithoutOrganizationInput, UserUncheckedCreateWithoutOrganizationInput> | UserCreateWithoutOrganizationInput[] | UserUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: UserCreateOrConnectWithoutOrganizationInput | UserCreateOrConnectWithoutOrganizationInput[]
    createMany?: UserCreateManyOrganizationInputEnvelope
    connect?: UserWhereUniqueInput | UserWhereUniqueInput[]
  }

  export type SubscriptionUncheckedCreateNestedManyWithoutOrganizationInput = {
    create?: XOR<SubscriptionCreateWithoutOrganizationInput, SubscriptionUncheckedCreateWithoutOrganizationInput> | SubscriptionCreateWithoutOrganizationInput[] | SubscriptionUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: SubscriptionCreateOrConnectWithoutOrganizationInput | SubscriptionCreateOrConnectWithoutOrganizationInput[]
    createMany?: SubscriptionCreateManyOrganizationInputEnvelope
    connect?: SubscriptionWhereUniqueInput | SubscriptionWhereUniqueInput[]
  }

  export type BillingEventUncheckedCreateNestedManyWithoutOrganizationInput = {
    create?: XOR<BillingEventCreateWithoutOrganizationInput, BillingEventUncheckedCreateWithoutOrganizationInput> | BillingEventCreateWithoutOrganizationInput[] | BillingEventUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: BillingEventCreateOrConnectWithoutOrganizationInput | BillingEventCreateOrConnectWithoutOrganizationInput[]
    createMany?: BillingEventCreateManyOrganizationInputEnvelope
    connect?: BillingEventWhereUniqueInput | BillingEventWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type UserUpdateManyWithoutOrganizationNestedInput = {
    create?: XOR<UserCreateWithoutOrganizationInput, UserUncheckedCreateWithoutOrganizationInput> | UserCreateWithoutOrganizationInput[] | UserUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: UserCreateOrConnectWithoutOrganizationInput | UserCreateOrConnectWithoutOrganizationInput[]
    upsert?: UserUpsertWithWhereUniqueWithoutOrganizationInput | UserUpsertWithWhereUniqueWithoutOrganizationInput[]
    createMany?: UserCreateManyOrganizationInputEnvelope
    set?: UserWhereUniqueInput | UserWhereUniqueInput[]
    disconnect?: UserWhereUniqueInput | UserWhereUniqueInput[]
    delete?: UserWhereUniqueInput | UserWhereUniqueInput[]
    connect?: UserWhereUniqueInput | UserWhereUniqueInput[]
    update?: UserUpdateWithWhereUniqueWithoutOrganizationInput | UserUpdateWithWhereUniqueWithoutOrganizationInput[]
    updateMany?: UserUpdateManyWithWhereWithoutOrganizationInput | UserUpdateManyWithWhereWithoutOrganizationInput[]
    deleteMany?: UserScalarWhereInput | UserScalarWhereInput[]
  }

  export type SubscriptionUpdateManyWithoutOrganizationNestedInput = {
    create?: XOR<SubscriptionCreateWithoutOrganizationInput, SubscriptionUncheckedCreateWithoutOrganizationInput> | SubscriptionCreateWithoutOrganizationInput[] | SubscriptionUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: SubscriptionCreateOrConnectWithoutOrganizationInput | SubscriptionCreateOrConnectWithoutOrganizationInput[]
    upsert?: SubscriptionUpsertWithWhereUniqueWithoutOrganizationInput | SubscriptionUpsertWithWhereUniqueWithoutOrganizationInput[]
    createMany?: SubscriptionCreateManyOrganizationInputEnvelope
    set?: SubscriptionWhereUniqueInput | SubscriptionWhereUniqueInput[]
    disconnect?: SubscriptionWhereUniqueInput | SubscriptionWhereUniqueInput[]
    delete?: SubscriptionWhereUniqueInput | SubscriptionWhereUniqueInput[]
    connect?: SubscriptionWhereUniqueInput | SubscriptionWhereUniqueInput[]
    update?: SubscriptionUpdateWithWhereUniqueWithoutOrganizationInput | SubscriptionUpdateWithWhereUniqueWithoutOrganizationInput[]
    updateMany?: SubscriptionUpdateManyWithWhereWithoutOrganizationInput | SubscriptionUpdateManyWithWhereWithoutOrganizationInput[]
    deleteMany?: SubscriptionScalarWhereInput | SubscriptionScalarWhereInput[]
  }

  export type BillingEventUpdateManyWithoutOrganizationNestedInput = {
    create?: XOR<BillingEventCreateWithoutOrganizationInput, BillingEventUncheckedCreateWithoutOrganizationInput> | BillingEventCreateWithoutOrganizationInput[] | BillingEventUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: BillingEventCreateOrConnectWithoutOrganizationInput | BillingEventCreateOrConnectWithoutOrganizationInput[]
    upsert?: BillingEventUpsertWithWhereUniqueWithoutOrganizationInput | BillingEventUpsertWithWhereUniqueWithoutOrganizationInput[]
    createMany?: BillingEventCreateManyOrganizationInputEnvelope
    set?: BillingEventWhereUniqueInput | BillingEventWhereUniqueInput[]
    disconnect?: BillingEventWhereUniqueInput | BillingEventWhereUniqueInput[]
    delete?: BillingEventWhereUniqueInput | BillingEventWhereUniqueInput[]
    connect?: BillingEventWhereUniqueInput | BillingEventWhereUniqueInput[]
    update?: BillingEventUpdateWithWhereUniqueWithoutOrganizationInput | BillingEventUpdateWithWhereUniqueWithoutOrganizationInput[]
    updateMany?: BillingEventUpdateManyWithWhereWithoutOrganizationInput | BillingEventUpdateManyWithWhereWithoutOrganizationInput[]
    deleteMany?: BillingEventScalarWhereInput | BillingEventScalarWhereInput[]
  }

  export type UserUncheckedUpdateManyWithoutOrganizationNestedInput = {
    create?: XOR<UserCreateWithoutOrganizationInput, UserUncheckedCreateWithoutOrganizationInput> | UserCreateWithoutOrganizationInput[] | UserUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: UserCreateOrConnectWithoutOrganizationInput | UserCreateOrConnectWithoutOrganizationInput[]
    upsert?: UserUpsertWithWhereUniqueWithoutOrganizationInput | UserUpsertWithWhereUniqueWithoutOrganizationInput[]
    createMany?: UserCreateManyOrganizationInputEnvelope
    set?: UserWhereUniqueInput | UserWhereUniqueInput[]
    disconnect?: UserWhereUniqueInput | UserWhereUniqueInput[]
    delete?: UserWhereUniqueInput | UserWhereUniqueInput[]
    connect?: UserWhereUniqueInput | UserWhereUniqueInput[]
    update?: UserUpdateWithWhereUniqueWithoutOrganizationInput | UserUpdateWithWhereUniqueWithoutOrganizationInput[]
    updateMany?: UserUpdateManyWithWhereWithoutOrganizationInput | UserUpdateManyWithWhereWithoutOrganizationInput[]
    deleteMany?: UserScalarWhereInput | UserScalarWhereInput[]
  }

  export type SubscriptionUncheckedUpdateManyWithoutOrganizationNestedInput = {
    create?: XOR<SubscriptionCreateWithoutOrganizationInput, SubscriptionUncheckedCreateWithoutOrganizationInput> | SubscriptionCreateWithoutOrganizationInput[] | SubscriptionUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: SubscriptionCreateOrConnectWithoutOrganizationInput | SubscriptionCreateOrConnectWithoutOrganizationInput[]
    upsert?: SubscriptionUpsertWithWhereUniqueWithoutOrganizationInput | SubscriptionUpsertWithWhereUniqueWithoutOrganizationInput[]
    createMany?: SubscriptionCreateManyOrganizationInputEnvelope
    set?: SubscriptionWhereUniqueInput | SubscriptionWhereUniqueInput[]
    disconnect?: SubscriptionWhereUniqueInput | SubscriptionWhereUniqueInput[]
    delete?: SubscriptionWhereUniqueInput | SubscriptionWhereUniqueInput[]
    connect?: SubscriptionWhereUniqueInput | SubscriptionWhereUniqueInput[]
    update?: SubscriptionUpdateWithWhereUniqueWithoutOrganizationInput | SubscriptionUpdateWithWhereUniqueWithoutOrganizationInput[]
    updateMany?: SubscriptionUpdateManyWithWhereWithoutOrganizationInput | SubscriptionUpdateManyWithWhereWithoutOrganizationInput[]
    deleteMany?: SubscriptionScalarWhereInput | SubscriptionScalarWhereInput[]
  }

  export type BillingEventUncheckedUpdateManyWithoutOrganizationNestedInput = {
    create?: XOR<BillingEventCreateWithoutOrganizationInput, BillingEventUncheckedCreateWithoutOrganizationInput> | BillingEventCreateWithoutOrganizationInput[] | BillingEventUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: BillingEventCreateOrConnectWithoutOrganizationInput | BillingEventCreateOrConnectWithoutOrganizationInput[]
    upsert?: BillingEventUpsertWithWhereUniqueWithoutOrganizationInput | BillingEventUpsertWithWhereUniqueWithoutOrganizationInput[]
    createMany?: BillingEventCreateManyOrganizationInputEnvelope
    set?: BillingEventWhereUniqueInput | BillingEventWhereUniqueInput[]
    disconnect?: BillingEventWhereUniqueInput | BillingEventWhereUniqueInput[]
    delete?: BillingEventWhereUniqueInput | BillingEventWhereUniqueInput[]
    connect?: BillingEventWhereUniqueInput | BillingEventWhereUniqueInput[]
    update?: BillingEventUpdateWithWhereUniqueWithoutOrganizationInput | BillingEventUpdateWithWhereUniqueWithoutOrganizationInput[]
    updateMany?: BillingEventUpdateManyWithWhereWithoutOrganizationInput | BillingEventUpdateManyWithWhereWithoutOrganizationInput[]
    deleteMany?: BillingEventScalarWhereInput | BillingEventScalarWhereInput[]
  }

  export type OrganizationCreateNestedOneWithoutUsersInput = {
    create?: XOR<OrganizationCreateWithoutUsersInput, OrganizationUncheckedCreateWithoutUsersInput>
    connectOrCreate?: OrganizationCreateOrConnectWithoutUsersInput
    connect?: OrganizationWhereUniqueInput
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type OrganizationUpdateOneRequiredWithoutUsersNestedInput = {
    create?: XOR<OrganizationCreateWithoutUsersInput, OrganizationUncheckedCreateWithoutUsersInput>
    connectOrCreate?: OrganizationCreateOrConnectWithoutUsersInput
    upsert?: OrganizationUpsertWithoutUsersInput
    connect?: OrganizationWhereUniqueInput
    update?: XOR<XOR<OrganizationUpdateToOneWithWhereWithoutUsersInput, OrganizationUpdateWithoutUsersInput>, OrganizationUncheckedUpdateWithoutUsersInput>
  }

  export type AdminAuditLogCreateNestedManyWithoutAdminInput = {
    create?: XOR<AdminAuditLogCreateWithoutAdminInput, AdminAuditLogUncheckedCreateWithoutAdminInput> | AdminAuditLogCreateWithoutAdminInput[] | AdminAuditLogUncheckedCreateWithoutAdminInput[]
    connectOrCreate?: AdminAuditLogCreateOrConnectWithoutAdminInput | AdminAuditLogCreateOrConnectWithoutAdminInput[]
    createMany?: AdminAuditLogCreateManyAdminInputEnvelope
    connect?: AdminAuditLogWhereUniqueInput | AdminAuditLogWhereUniqueInput[]
  }

  export type AdminSessionCreateNestedManyWithoutAdminInput = {
    create?: XOR<AdminSessionCreateWithoutAdminInput, AdminSessionUncheckedCreateWithoutAdminInput> | AdminSessionCreateWithoutAdminInput[] | AdminSessionUncheckedCreateWithoutAdminInput[]
    connectOrCreate?: AdminSessionCreateOrConnectWithoutAdminInput | AdminSessionCreateOrConnectWithoutAdminInput[]
    createMany?: AdminSessionCreateManyAdminInputEnvelope
    connect?: AdminSessionWhereUniqueInput | AdminSessionWhereUniqueInput[]
  }

  export type AdminAuditLogUncheckedCreateNestedManyWithoutAdminInput = {
    create?: XOR<AdminAuditLogCreateWithoutAdminInput, AdminAuditLogUncheckedCreateWithoutAdminInput> | AdminAuditLogCreateWithoutAdminInput[] | AdminAuditLogUncheckedCreateWithoutAdminInput[]
    connectOrCreate?: AdminAuditLogCreateOrConnectWithoutAdminInput | AdminAuditLogCreateOrConnectWithoutAdminInput[]
    createMany?: AdminAuditLogCreateManyAdminInputEnvelope
    connect?: AdminAuditLogWhereUniqueInput | AdminAuditLogWhereUniqueInput[]
  }

  export type AdminSessionUncheckedCreateNestedManyWithoutAdminInput = {
    create?: XOR<AdminSessionCreateWithoutAdminInput, AdminSessionUncheckedCreateWithoutAdminInput> | AdminSessionCreateWithoutAdminInput[] | AdminSessionUncheckedCreateWithoutAdminInput[]
    connectOrCreate?: AdminSessionCreateOrConnectWithoutAdminInput | AdminSessionCreateOrConnectWithoutAdminInput[]
    createMany?: AdminSessionCreateManyAdminInputEnvelope
    connect?: AdminSessionWhereUniqueInput | AdminSessionWhereUniqueInput[]
  }

  export type EnumAdminRoleFieldUpdateOperationsInput = {
    set?: $Enums.AdminRole
  }

  export type AdminAuditLogUpdateManyWithoutAdminNestedInput = {
    create?: XOR<AdminAuditLogCreateWithoutAdminInput, AdminAuditLogUncheckedCreateWithoutAdminInput> | AdminAuditLogCreateWithoutAdminInput[] | AdminAuditLogUncheckedCreateWithoutAdminInput[]
    connectOrCreate?: AdminAuditLogCreateOrConnectWithoutAdminInput | AdminAuditLogCreateOrConnectWithoutAdminInput[]
    upsert?: AdminAuditLogUpsertWithWhereUniqueWithoutAdminInput | AdminAuditLogUpsertWithWhereUniqueWithoutAdminInput[]
    createMany?: AdminAuditLogCreateManyAdminInputEnvelope
    set?: AdminAuditLogWhereUniqueInput | AdminAuditLogWhereUniqueInput[]
    disconnect?: AdminAuditLogWhereUniqueInput | AdminAuditLogWhereUniqueInput[]
    delete?: AdminAuditLogWhereUniqueInput | AdminAuditLogWhereUniqueInput[]
    connect?: AdminAuditLogWhereUniqueInput | AdminAuditLogWhereUniqueInput[]
    update?: AdminAuditLogUpdateWithWhereUniqueWithoutAdminInput | AdminAuditLogUpdateWithWhereUniqueWithoutAdminInput[]
    updateMany?: AdminAuditLogUpdateManyWithWhereWithoutAdminInput | AdminAuditLogUpdateManyWithWhereWithoutAdminInput[]
    deleteMany?: AdminAuditLogScalarWhereInput | AdminAuditLogScalarWhereInput[]
  }

  export type AdminSessionUpdateManyWithoutAdminNestedInput = {
    create?: XOR<AdminSessionCreateWithoutAdminInput, AdminSessionUncheckedCreateWithoutAdminInput> | AdminSessionCreateWithoutAdminInput[] | AdminSessionUncheckedCreateWithoutAdminInput[]
    connectOrCreate?: AdminSessionCreateOrConnectWithoutAdminInput | AdminSessionCreateOrConnectWithoutAdminInput[]
    upsert?: AdminSessionUpsertWithWhereUniqueWithoutAdminInput | AdminSessionUpsertWithWhereUniqueWithoutAdminInput[]
    createMany?: AdminSessionCreateManyAdminInputEnvelope
    set?: AdminSessionWhereUniqueInput | AdminSessionWhereUniqueInput[]
    disconnect?: AdminSessionWhereUniqueInput | AdminSessionWhereUniqueInput[]
    delete?: AdminSessionWhereUniqueInput | AdminSessionWhereUniqueInput[]
    connect?: AdminSessionWhereUniqueInput | AdminSessionWhereUniqueInput[]
    update?: AdminSessionUpdateWithWhereUniqueWithoutAdminInput | AdminSessionUpdateWithWhereUniqueWithoutAdminInput[]
    updateMany?: AdminSessionUpdateManyWithWhereWithoutAdminInput | AdminSessionUpdateManyWithWhereWithoutAdminInput[]
    deleteMany?: AdminSessionScalarWhereInput | AdminSessionScalarWhereInput[]
  }

  export type AdminAuditLogUncheckedUpdateManyWithoutAdminNestedInput = {
    create?: XOR<AdminAuditLogCreateWithoutAdminInput, AdminAuditLogUncheckedCreateWithoutAdminInput> | AdminAuditLogCreateWithoutAdminInput[] | AdminAuditLogUncheckedCreateWithoutAdminInput[]
    connectOrCreate?: AdminAuditLogCreateOrConnectWithoutAdminInput | AdminAuditLogCreateOrConnectWithoutAdminInput[]
    upsert?: AdminAuditLogUpsertWithWhereUniqueWithoutAdminInput | AdminAuditLogUpsertWithWhereUniqueWithoutAdminInput[]
    createMany?: AdminAuditLogCreateManyAdminInputEnvelope
    set?: AdminAuditLogWhereUniqueInput | AdminAuditLogWhereUniqueInput[]
    disconnect?: AdminAuditLogWhereUniqueInput | AdminAuditLogWhereUniqueInput[]
    delete?: AdminAuditLogWhereUniqueInput | AdminAuditLogWhereUniqueInput[]
    connect?: AdminAuditLogWhereUniqueInput | AdminAuditLogWhereUniqueInput[]
    update?: AdminAuditLogUpdateWithWhereUniqueWithoutAdminInput | AdminAuditLogUpdateWithWhereUniqueWithoutAdminInput[]
    updateMany?: AdminAuditLogUpdateManyWithWhereWithoutAdminInput | AdminAuditLogUpdateManyWithWhereWithoutAdminInput[]
    deleteMany?: AdminAuditLogScalarWhereInput | AdminAuditLogScalarWhereInput[]
  }

  export type AdminSessionUncheckedUpdateManyWithoutAdminNestedInput = {
    create?: XOR<AdminSessionCreateWithoutAdminInput, AdminSessionUncheckedCreateWithoutAdminInput> | AdminSessionCreateWithoutAdminInput[] | AdminSessionUncheckedCreateWithoutAdminInput[]
    connectOrCreate?: AdminSessionCreateOrConnectWithoutAdminInput | AdminSessionCreateOrConnectWithoutAdminInput[]
    upsert?: AdminSessionUpsertWithWhereUniqueWithoutAdminInput | AdminSessionUpsertWithWhereUniqueWithoutAdminInput[]
    createMany?: AdminSessionCreateManyAdminInputEnvelope
    set?: AdminSessionWhereUniqueInput | AdminSessionWhereUniqueInput[]
    disconnect?: AdminSessionWhereUniqueInput | AdminSessionWhereUniqueInput[]
    delete?: AdminSessionWhereUniqueInput | AdminSessionWhereUniqueInput[]
    connect?: AdminSessionWhereUniqueInput | AdminSessionWhereUniqueInput[]
    update?: AdminSessionUpdateWithWhereUniqueWithoutAdminInput | AdminSessionUpdateWithWhereUniqueWithoutAdminInput[]
    updateMany?: AdminSessionUpdateManyWithWhereWithoutAdminInput | AdminSessionUpdateManyWithWhereWithoutAdminInput[]
    deleteMany?: AdminSessionScalarWhereInput | AdminSessionScalarWhereInput[]
  }

  export type PlatformAdminCreateNestedOneWithoutAuditLogsInput = {
    create?: XOR<PlatformAdminCreateWithoutAuditLogsInput, PlatformAdminUncheckedCreateWithoutAuditLogsInput>
    connectOrCreate?: PlatformAdminCreateOrConnectWithoutAuditLogsInput
    connect?: PlatformAdminWhereUniqueInput
  }

  export type PlatformAdminUpdateOneRequiredWithoutAuditLogsNestedInput = {
    create?: XOR<PlatformAdminCreateWithoutAuditLogsInput, PlatformAdminUncheckedCreateWithoutAuditLogsInput>
    connectOrCreate?: PlatformAdminCreateOrConnectWithoutAuditLogsInput
    upsert?: PlatformAdminUpsertWithoutAuditLogsInput
    connect?: PlatformAdminWhereUniqueInput
    update?: XOR<XOR<PlatformAdminUpdateToOneWithWhereWithoutAuditLogsInput, PlatformAdminUpdateWithoutAuditLogsInput>, PlatformAdminUncheckedUpdateWithoutAuditLogsInput>
  }

  export type PlatformAdminCreateNestedOneWithoutSessionsInput = {
    create?: XOR<PlatformAdminCreateWithoutSessionsInput, PlatformAdminUncheckedCreateWithoutSessionsInput>
    connectOrCreate?: PlatformAdminCreateOrConnectWithoutSessionsInput
    connect?: PlatformAdminWhereUniqueInput
  }

  export type PlatformAdminUpdateOneRequiredWithoutSessionsNestedInput = {
    create?: XOR<PlatformAdminCreateWithoutSessionsInput, PlatformAdminUncheckedCreateWithoutSessionsInput>
    connectOrCreate?: PlatformAdminCreateOrConnectWithoutSessionsInput
    upsert?: PlatformAdminUpsertWithoutSessionsInput
    connect?: PlatformAdminWhereUniqueInput
    update?: XOR<XOR<PlatformAdminUpdateToOneWithWhereWithoutSessionsInput, PlatformAdminUpdateWithoutSessionsInput>, PlatformAdminUncheckedUpdateWithoutSessionsInput>
  }

  export type OrganizationCreateNestedOneWithoutSubscriptionsInput = {
    create?: XOR<OrganizationCreateWithoutSubscriptionsInput, OrganizationUncheckedCreateWithoutSubscriptionsInput>
    connectOrCreate?: OrganizationCreateOrConnectWithoutSubscriptionsInput
    connect?: OrganizationWhereUniqueInput
  }

  export type BillingEventCreateNestedManyWithoutSubscriptionInput = {
    create?: XOR<BillingEventCreateWithoutSubscriptionInput, BillingEventUncheckedCreateWithoutSubscriptionInput> | BillingEventCreateWithoutSubscriptionInput[] | BillingEventUncheckedCreateWithoutSubscriptionInput[]
    connectOrCreate?: BillingEventCreateOrConnectWithoutSubscriptionInput | BillingEventCreateOrConnectWithoutSubscriptionInput[]
    createMany?: BillingEventCreateManySubscriptionInputEnvelope
    connect?: BillingEventWhereUniqueInput | BillingEventWhereUniqueInput[]
  }

  export type BillingEventUncheckedCreateNestedManyWithoutSubscriptionInput = {
    create?: XOR<BillingEventCreateWithoutSubscriptionInput, BillingEventUncheckedCreateWithoutSubscriptionInput> | BillingEventCreateWithoutSubscriptionInput[] | BillingEventUncheckedCreateWithoutSubscriptionInput[]
    connectOrCreate?: BillingEventCreateOrConnectWithoutSubscriptionInput | BillingEventCreateOrConnectWithoutSubscriptionInput[]
    createMany?: BillingEventCreateManySubscriptionInputEnvelope
    connect?: BillingEventWhereUniqueInput | BillingEventWhereUniqueInput[]
  }

  export type EnumSubscriptionPlanFieldUpdateOperationsInput = {
    set?: $Enums.SubscriptionPlan
  }

  export type EnumSubscriptionStatusFieldUpdateOperationsInput = {
    set?: $Enums.SubscriptionStatus
  }

  export type NullableDecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string | null
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type OrganizationUpdateOneRequiredWithoutSubscriptionsNestedInput = {
    create?: XOR<OrganizationCreateWithoutSubscriptionsInput, OrganizationUncheckedCreateWithoutSubscriptionsInput>
    connectOrCreate?: OrganizationCreateOrConnectWithoutSubscriptionsInput
    upsert?: OrganizationUpsertWithoutSubscriptionsInput
    connect?: OrganizationWhereUniqueInput
    update?: XOR<XOR<OrganizationUpdateToOneWithWhereWithoutSubscriptionsInput, OrganizationUpdateWithoutSubscriptionsInput>, OrganizationUncheckedUpdateWithoutSubscriptionsInput>
  }

  export type BillingEventUpdateManyWithoutSubscriptionNestedInput = {
    create?: XOR<BillingEventCreateWithoutSubscriptionInput, BillingEventUncheckedCreateWithoutSubscriptionInput> | BillingEventCreateWithoutSubscriptionInput[] | BillingEventUncheckedCreateWithoutSubscriptionInput[]
    connectOrCreate?: BillingEventCreateOrConnectWithoutSubscriptionInput | BillingEventCreateOrConnectWithoutSubscriptionInput[]
    upsert?: BillingEventUpsertWithWhereUniqueWithoutSubscriptionInput | BillingEventUpsertWithWhereUniqueWithoutSubscriptionInput[]
    createMany?: BillingEventCreateManySubscriptionInputEnvelope
    set?: BillingEventWhereUniqueInput | BillingEventWhereUniqueInput[]
    disconnect?: BillingEventWhereUniqueInput | BillingEventWhereUniqueInput[]
    delete?: BillingEventWhereUniqueInput | BillingEventWhereUniqueInput[]
    connect?: BillingEventWhereUniqueInput | BillingEventWhereUniqueInput[]
    update?: BillingEventUpdateWithWhereUniqueWithoutSubscriptionInput | BillingEventUpdateWithWhereUniqueWithoutSubscriptionInput[]
    updateMany?: BillingEventUpdateManyWithWhereWithoutSubscriptionInput | BillingEventUpdateManyWithWhereWithoutSubscriptionInput[]
    deleteMany?: BillingEventScalarWhereInput | BillingEventScalarWhereInput[]
  }

  export type BillingEventUncheckedUpdateManyWithoutSubscriptionNestedInput = {
    create?: XOR<BillingEventCreateWithoutSubscriptionInput, BillingEventUncheckedCreateWithoutSubscriptionInput> | BillingEventCreateWithoutSubscriptionInput[] | BillingEventUncheckedCreateWithoutSubscriptionInput[]
    connectOrCreate?: BillingEventCreateOrConnectWithoutSubscriptionInput | BillingEventCreateOrConnectWithoutSubscriptionInput[]
    upsert?: BillingEventUpsertWithWhereUniqueWithoutSubscriptionInput | BillingEventUpsertWithWhereUniqueWithoutSubscriptionInput[]
    createMany?: BillingEventCreateManySubscriptionInputEnvelope
    set?: BillingEventWhereUniqueInput | BillingEventWhereUniqueInput[]
    disconnect?: BillingEventWhereUniqueInput | BillingEventWhereUniqueInput[]
    delete?: BillingEventWhereUniqueInput | BillingEventWhereUniqueInput[]
    connect?: BillingEventWhereUniqueInput | BillingEventWhereUniqueInput[]
    update?: BillingEventUpdateWithWhereUniqueWithoutSubscriptionInput | BillingEventUpdateWithWhereUniqueWithoutSubscriptionInput[]
    updateMany?: BillingEventUpdateManyWithWhereWithoutSubscriptionInput | BillingEventUpdateManyWithWhereWithoutSubscriptionInput[]
    deleteMany?: BillingEventScalarWhereInput | BillingEventScalarWhereInput[]
  }

  export type OrganizationCreateNestedOneWithoutBillingEventsInput = {
    create?: XOR<OrganizationCreateWithoutBillingEventsInput, OrganizationUncheckedCreateWithoutBillingEventsInput>
    connectOrCreate?: OrganizationCreateOrConnectWithoutBillingEventsInput
    connect?: OrganizationWhereUniqueInput
  }

  export type SubscriptionCreateNestedOneWithoutBillingEventsInput = {
    create?: XOR<SubscriptionCreateWithoutBillingEventsInput, SubscriptionUncheckedCreateWithoutBillingEventsInput>
    connectOrCreate?: SubscriptionCreateOrConnectWithoutBillingEventsInput
    connect?: SubscriptionWhereUniqueInput
  }

  export type EnumBillingEventTypeFieldUpdateOperationsInput = {
    set?: $Enums.BillingEventType
  }

  export type OrganizationUpdateOneRequiredWithoutBillingEventsNestedInput = {
    create?: XOR<OrganizationCreateWithoutBillingEventsInput, OrganizationUncheckedCreateWithoutBillingEventsInput>
    connectOrCreate?: OrganizationCreateOrConnectWithoutBillingEventsInput
    upsert?: OrganizationUpsertWithoutBillingEventsInput
    connect?: OrganizationWhereUniqueInput
    update?: XOR<XOR<OrganizationUpdateToOneWithWhereWithoutBillingEventsInput, OrganizationUpdateWithoutBillingEventsInput>, OrganizationUncheckedUpdateWithoutBillingEventsInput>
  }

  export type SubscriptionUpdateOneWithoutBillingEventsNestedInput = {
    create?: XOR<SubscriptionCreateWithoutBillingEventsInput, SubscriptionUncheckedCreateWithoutBillingEventsInput>
    connectOrCreate?: SubscriptionCreateOrConnectWithoutBillingEventsInput
    upsert?: SubscriptionUpsertWithoutBillingEventsInput
    disconnect?: SubscriptionWhereInput | boolean
    delete?: SubscriptionWhereInput | boolean
    connect?: SubscriptionWhereUniqueInput
    update?: XOR<XOR<SubscriptionUpdateToOneWithWhereWithoutBillingEventsInput, SubscriptionUpdateWithoutBillingEventsInput>, SubscriptionUncheckedUpdateWithoutBillingEventsInput>
  }

  export type EnumMetricPeriodFieldUpdateOperationsInput = {
    set?: $Enums.MetricPeriod
  }

  export type DecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }
  export type NestedJsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedEnumAdminRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.AdminRole | EnumAdminRoleFieldRefInput<$PrismaModel>
    in?: $Enums.AdminRole[] | ListEnumAdminRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.AdminRole[] | ListEnumAdminRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumAdminRoleFilter<$PrismaModel> | $Enums.AdminRole
  }

  export type NestedEnumAdminRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AdminRole | EnumAdminRoleFieldRefInput<$PrismaModel>
    in?: $Enums.AdminRole[] | ListEnumAdminRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.AdminRole[] | ListEnumAdminRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumAdminRoleWithAggregatesFilter<$PrismaModel> | $Enums.AdminRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAdminRoleFilter<$PrismaModel>
    _max?: NestedEnumAdminRoleFilter<$PrismaModel>
  }
  export type NestedJsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedEnumSubscriptionPlanFilter<$PrismaModel = never> = {
    equals?: $Enums.SubscriptionPlan | EnumSubscriptionPlanFieldRefInput<$PrismaModel>
    in?: $Enums.SubscriptionPlan[] | ListEnumSubscriptionPlanFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubscriptionPlan[] | ListEnumSubscriptionPlanFieldRefInput<$PrismaModel>
    not?: NestedEnumSubscriptionPlanFilter<$PrismaModel> | $Enums.SubscriptionPlan
  }

  export type NestedEnumSubscriptionStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.SubscriptionStatus | EnumSubscriptionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSubscriptionStatusFilter<$PrismaModel> | $Enums.SubscriptionStatus
  }

  export type NestedDecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type NestedEnumSubscriptionPlanWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SubscriptionPlan | EnumSubscriptionPlanFieldRefInput<$PrismaModel>
    in?: $Enums.SubscriptionPlan[] | ListEnumSubscriptionPlanFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubscriptionPlan[] | ListEnumSubscriptionPlanFieldRefInput<$PrismaModel>
    not?: NestedEnumSubscriptionPlanWithAggregatesFilter<$PrismaModel> | $Enums.SubscriptionPlan
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSubscriptionPlanFilter<$PrismaModel>
    _max?: NestedEnumSubscriptionPlanFilter<$PrismaModel>
  }

  export type NestedEnumSubscriptionStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SubscriptionStatus | EnumSubscriptionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSubscriptionStatusWithAggregatesFilter<$PrismaModel> | $Enums.SubscriptionStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSubscriptionStatusFilter<$PrismaModel>
    _max?: NestedEnumSubscriptionStatusFilter<$PrismaModel>
  }

  export type NestedDecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }

  export type NestedEnumBillingEventTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.BillingEventType | EnumBillingEventTypeFieldRefInput<$PrismaModel>
    in?: $Enums.BillingEventType[] | ListEnumBillingEventTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.BillingEventType[] | ListEnumBillingEventTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumBillingEventTypeFilter<$PrismaModel> | $Enums.BillingEventType
  }

  export type NestedEnumBillingEventTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.BillingEventType | EnumBillingEventTypeFieldRefInput<$PrismaModel>
    in?: $Enums.BillingEventType[] | ListEnumBillingEventTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.BillingEventType[] | ListEnumBillingEventTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumBillingEventTypeWithAggregatesFilter<$PrismaModel> | $Enums.BillingEventType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumBillingEventTypeFilter<$PrismaModel>
    _max?: NestedEnumBillingEventTypeFilter<$PrismaModel>
  }

  export type NestedEnumMetricPeriodFilter<$PrismaModel = never> = {
    equals?: $Enums.MetricPeriod | EnumMetricPeriodFieldRefInput<$PrismaModel>
    in?: $Enums.MetricPeriod[] | ListEnumMetricPeriodFieldRefInput<$PrismaModel>
    notIn?: $Enums.MetricPeriod[] | ListEnumMetricPeriodFieldRefInput<$PrismaModel>
    not?: NestedEnumMetricPeriodFilter<$PrismaModel> | $Enums.MetricPeriod
  }

  export type NestedDecimalFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
  }

  export type NestedEnumMetricPeriodWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.MetricPeriod | EnumMetricPeriodFieldRefInput<$PrismaModel>
    in?: $Enums.MetricPeriod[] | ListEnumMetricPeriodFieldRefInput<$PrismaModel>
    notIn?: $Enums.MetricPeriod[] | ListEnumMetricPeriodFieldRefInput<$PrismaModel>
    not?: NestedEnumMetricPeriodWithAggregatesFilter<$PrismaModel> | $Enums.MetricPeriod
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumMetricPeriodFilter<$PrismaModel>
    _max?: NestedEnumMetricPeriodFilter<$PrismaModel>
  }

  export type NestedDecimalWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedDecimalFilter<$PrismaModel>
    _sum?: NestedDecimalFilter<$PrismaModel>
    _min?: NestedDecimalFilter<$PrismaModel>
    _max?: NestedDecimalFilter<$PrismaModel>
  }

  export type UserCreateWithoutOrganizationInput = {
    id?: string
    email: string
    password?: string | null
    firstName: string
    lastName: string
    phone?: string | null
    phoneCarrier?: string | null
    role?: string
    accountSetupToken?: string | null
    accountSetupTokenExpires?: Date | string | null
    twoFactorSecret?: string | null
    twoFactorBackupCodes?: NullableJsonNullValueInput | InputJsonValue
    twoFactorEnabledAt?: Date | string | null
    twoFactorOTP?: NullableJsonNullValueInput | InputJsonValue
    trustedDevices?: NullableJsonNullValueInput | InputJsonValue
    isActive?: boolean
    isEmailVerified?: boolean
    lastLoginAt?: Date | string | null
    loginAttempts?: number
    lockedUntil?: Date | string | null
    passwordResetToken?: string | null
    passwordResetTokenExpires?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUncheckedCreateWithoutOrganizationInput = {
    id?: string
    email: string
    password?: string | null
    firstName: string
    lastName: string
    phone?: string | null
    phoneCarrier?: string | null
    role?: string
    accountSetupToken?: string | null
    accountSetupTokenExpires?: Date | string | null
    twoFactorSecret?: string | null
    twoFactorBackupCodes?: NullableJsonNullValueInput | InputJsonValue
    twoFactorEnabledAt?: Date | string | null
    twoFactorOTP?: NullableJsonNullValueInput | InputJsonValue
    trustedDevices?: NullableJsonNullValueInput | InputJsonValue
    isActive?: boolean
    isEmailVerified?: boolean
    lastLoginAt?: Date | string | null
    loginAttempts?: number
    lockedUntil?: Date | string | null
    passwordResetToken?: string | null
    passwordResetTokenExpires?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserCreateOrConnectWithoutOrganizationInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutOrganizationInput, UserUncheckedCreateWithoutOrganizationInput>
  }

  export type UserCreateManyOrganizationInputEnvelope = {
    data: UserCreateManyOrganizationInput | UserCreateManyOrganizationInput[]
    skipDuplicates?: boolean
  }

  export type SubscriptionCreateWithoutOrganizationInput = {
    id?: string
    stripeSubscriptionId?: string | null
    stripePriceId?: string | null
    plan: $Enums.SubscriptionPlan
    status: $Enums.SubscriptionStatus
    currentPeriodStart: Date | string
    currentPeriodEnd: Date | string
    trialStart?: Date | string | null
    trialEnd?: Date | string | null
    canceledAt?: Date | string | null
    cancelAtPeriodEnd?: boolean
    monthlyRevenue?: Decimal | DecimalJsLike | number | string | null
    yearlyRevenue?: Decimal | DecimalJsLike | number | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    billingEvents?: BillingEventCreateNestedManyWithoutSubscriptionInput
  }

  export type SubscriptionUncheckedCreateWithoutOrganizationInput = {
    id?: string
    stripeSubscriptionId?: string | null
    stripePriceId?: string | null
    plan: $Enums.SubscriptionPlan
    status: $Enums.SubscriptionStatus
    currentPeriodStart: Date | string
    currentPeriodEnd: Date | string
    trialStart?: Date | string | null
    trialEnd?: Date | string | null
    canceledAt?: Date | string | null
    cancelAtPeriodEnd?: boolean
    monthlyRevenue?: Decimal | DecimalJsLike | number | string | null
    yearlyRevenue?: Decimal | DecimalJsLike | number | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    billingEvents?: BillingEventUncheckedCreateNestedManyWithoutSubscriptionInput
  }

  export type SubscriptionCreateOrConnectWithoutOrganizationInput = {
    where: SubscriptionWhereUniqueInput
    create: XOR<SubscriptionCreateWithoutOrganizationInput, SubscriptionUncheckedCreateWithoutOrganizationInput>
  }

  export type SubscriptionCreateManyOrganizationInputEnvelope = {
    data: SubscriptionCreateManyOrganizationInput | SubscriptionCreateManyOrganizationInput[]
    skipDuplicates?: boolean
  }

  export type BillingEventCreateWithoutOrganizationInput = {
    id?: string
    stripeEventId?: string | null
    eventType: $Enums.BillingEventType
    amount?: Decimal | DecimalJsLike | number | string | null
    currency?: string | null
    description?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    processedAt?: Date | string | null
    createdAt?: Date | string
    subscription?: SubscriptionCreateNestedOneWithoutBillingEventsInput
  }

  export type BillingEventUncheckedCreateWithoutOrganizationInput = {
    id?: string
    subscriptionId?: string | null
    stripeEventId?: string | null
    eventType: $Enums.BillingEventType
    amount?: Decimal | DecimalJsLike | number | string | null
    currency?: string | null
    description?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    processedAt?: Date | string | null
    createdAt?: Date | string
  }

  export type BillingEventCreateOrConnectWithoutOrganizationInput = {
    where: BillingEventWhereUniqueInput
    create: XOR<BillingEventCreateWithoutOrganizationInput, BillingEventUncheckedCreateWithoutOrganizationInput>
  }

  export type BillingEventCreateManyOrganizationInputEnvelope = {
    data: BillingEventCreateManyOrganizationInput | BillingEventCreateManyOrganizationInput[]
    skipDuplicates?: boolean
  }

  export type UserUpsertWithWhereUniqueWithoutOrganizationInput = {
    where: UserWhereUniqueInput
    update: XOR<UserUpdateWithoutOrganizationInput, UserUncheckedUpdateWithoutOrganizationInput>
    create: XOR<UserCreateWithoutOrganizationInput, UserUncheckedCreateWithoutOrganizationInput>
  }

  export type UserUpdateWithWhereUniqueWithoutOrganizationInput = {
    where: UserWhereUniqueInput
    data: XOR<UserUpdateWithoutOrganizationInput, UserUncheckedUpdateWithoutOrganizationInput>
  }

  export type UserUpdateManyWithWhereWithoutOrganizationInput = {
    where: UserScalarWhereInput
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyWithoutOrganizationInput>
  }

  export type UserScalarWhereInput = {
    AND?: UserScalarWhereInput | UserScalarWhereInput[]
    OR?: UserScalarWhereInput[]
    NOT?: UserScalarWhereInput | UserScalarWhereInput[]
    id?: StringFilter<"User"> | string
    email?: StringFilter<"User"> | string
    password?: StringNullableFilter<"User"> | string | null
    firstName?: StringFilter<"User"> | string
    lastName?: StringFilter<"User"> | string
    phone?: StringNullableFilter<"User"> | string | null
    phoneCarrier?: StringNullableFilter<"User"> | string | null
    organizationId?: StringFilter<"User"> | string
    role?: StringFilter<"User"> | string
    accountSetupToken?: StringNullableFilter<"User"> | string | null
    accountSetupTokenExpires?: DateTimeNullableFilter<"User"> | Date | string | null
    twoFactorSecret?: StringNullableFilter<"User"> | string | null
    twoFactorBackupCodes?: JsonNullableFilter<"User">
    twoFactorEnabledAt?: DateTimeNullableFilter<"User"> | Date | string | null
    twoFactorOTP?: JsonNullableFilter<"User">
    trustedDevices?: JsonNullableFilter<"User">
    isActive?: BoolFilter<"User"> | boolean
    isEmailVerified?: BoolFilter<"User"> | boolean
    lastLoginAt?: DateTimeNullableFilter<"User"> | Date | string | null
    loginAttempts?: IntFilter<"User"> | number
    lockedUntil?: DateTimeNullableFilter<"User"> | Date | string | null
    passwordResetToken?: StringNullableFilter<"User"> | string | null
    passwordResetTokenExpires?: DateTimeNullableFilter<"User"> | Date | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
  }

  export type SubscriptionUpsertWithWhereUniqueWithoutOrganizationInput = {
    where: SubscriptionWhereUniqueInput
    update: XOR<SubscriptionUpdateWithoutOrganizationInput, SubscriptionUncheckedUpdateWithoutOrganizationInput>
    create: XOR<SubscriptionCreateWithoutOrganizationInput, SubscriptionUncheckedCreateWithoutOrganizationInput>
  }

  export type SubscriptionUpdateWithWhereUniqueWithoutOrganizationInput = {
    where: SubscriptionWhereUniqueInput
    data: XOR<SubscriptionUpdateWithoutOrganizationInput, SubscriptionUncheckedUpdateWithoutOrganizationInput>
  }

  export type SubscriptionUpdateManyWithWhereWithoutOrganizationInput = {
    where: SubscriptionScalarWhereInput
    data: XOR<SubscriptionUpdateManyMutationInput, SubscriptionUncheckedUpdateManyWithoutOrganizationInput>
  }

  export type SubscriptionScalarWhereInput = {
    AND?: SubscriptionScalarWhereInput | SubscriptionScalarWhereInput[]
    OR?: SubscriptionScalarWhereInput[]
    NOT?: SubscriptionScalarWhereInput | SubscriptionScalarWhereInput[]
    id?: StringFilter<"Subscription"> | string
    organizationId?: StringFilter<"Subscription"> | string
    stripeSubscriptionId?: StringNullableFilter<"Subscription"> | string | null
    stripePriceId?: StringNullableFilter<"Subscription"> | string | null
    plan?: EnumSubscriptionPlanFilter<"Subscription"> | $Enums.SubscriptionPlan
    status?: EnumSubscriptionStatusFilter<"Subscription"> | $Enums.SubscriptionStatus
    currentPeriodStart?: DateTimeFilter<"Subscription"> | Date | string
    currentPeriodEnd?: DateTimeFilter<"Subscription"> | Date | string
    trialStart?: DateTimeNullableFilter<"Subscription"> | Date | string | null
    trialEnd?: DateTimeNullableFilter<"Subscription"> | Date | string | null
    canceledAt?: DateTimeNullableFilter<"Subscription"> | Date | string | null
    cancelAtPeriodEnd?: BoolFilter<"Subscription"> | boolean
    monthlyRevenue?: DecimalNullableFilter<"Subscription"> | Decimal | DecimalJsLike | number | string | null
    yearlyRevenue?: DecimalNullableFilter<"Subscription"> | Decimal | DecimalJsLike | number | string | null
    createdAt?: DateTimeFilter<"Subscription"> | Date | string
    updatedAt?: DateTimeFilter<"Subscription"> | Date | string
  }

  export type BillingEventUpsertWithWhereUniqueWithoutOrganizationInput = {
    where: BillingEventWhereUniqueInput
    update: XOR<BillingEventUpdateWithoutOrganizationInput, BillingEventUncheckedUpdateWithoutOrganizationInput>
    create: XOR<BillingEventCreateWithoutOrganizationInput, BillingEventUncheckedCreateWithoutOrganizationInput>
  }

  export type BillingEventUpdateWithWhereUniqueWithoutOrganizationInput = {
    where: BillingEventWhereUniqueInput
    data: XOR<BillingEventUpdateWithoutOrganizationInput, BillingEventUncheckedUpdateWithoutOrganizationInput>
  }

  export type BillingEventUpdateManyWithWhereWithoutOrganizationInput = {
    where: BillingEventScalarWhereInput
    data: XOR<BillingEventUpdateManyMutationInput, BillingEventUncheckedUpdateManyWithoutOrganizationInput>
  }

  export type BillingEventScalarWhereInput = {
    AND?: BillingEventScalarWhereInput | BillingEventScalarWhereInput[]
    OR?: BillingEventScalarWhereInput[]
    NOT?: BillingEventScalarWhereInput | BillingEventScalarWhereInput[]
    id?: StringFilter<"BillingEvent"> | string
    organizationId?: StringFilter<"BillingEvent"> | string
    subscriptionId?: StringNullableFilter<"BillingEvent"> | string | null
    stripeEventId?: StringNullableFilter<"BillingEvent"> | string | null
    eventType?: EnumBillingEventTypeFilter<"BillingEvent"> | $Enums.BillingEventType
    amount?: DecimalNullableFilter<"BillingEvent"> | Decimal | DecimalJsLike | number | string | null
    currency?: StringNullableFilter<"BillingEvent"> | string | null
    description?: StringNullableFilter<"BillingEvent"> | string | null
    metadata?: JsonNullableFilter<"BillingEvent">
    processedAt?: DateTimeNullableFilter<"BillingEvent"> | Date | string | null
    createdAt?: DateTimeFilter<"BillingEvent"> | Date | string
  }

  export type OrganizationCreateWithoutUsersInput = {
    id?: string
    name: string
    slug: string
    isActive?: boolean
    settings?: NullableJsonNullValueInput | InputJsonValue
    stripeCustomerId?: string | null
    billingEmail?: string | null
    trialEndsAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    subscriptions?: SubscriptionCreateNestedManyWithoutOrganizationInput
    billingEvents?: BillingEventCreateNestedManyWithoutOrganizationInput
  }

  export type OrganizationUncheckedCreateWithoutUsersInput = {
    id?: string
    name: string
    slug: string
    isActive?: boolean
    settings?: NullableJsonNullValueInput | InputJsonValue
    stripeCustomerId?: string | null
    billingEmail?: string | null
    trialEndsAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    subscriptions?: SubscriptionUncheckedCreateNestedManyWithoutOrganizationInput
    billingEvents?: BillingEventUncheckedCreateNestedManyWithoutOrganizationInput
  }

  export type OrganizationCreateOrConnectWithoutUsersInput = {
    where: OrganizationWhereUniqueInput
    create: XOR<OrganizationCreateWithoutUsersInput, OrganizationUncheckedCreateWithoutUsersInput>
  }

  export type OrganizationUpsertWithoutUsersInput = {
    update: XOR<OrganizationUpdateWithoutUsersInput, OrganizationUncheckedUpdateWithoutUsersInput>
    create: XOR<OrganizationCreateWithoutUsersInput, OrganizationUncheckedCreateWithoutUsersInput>
    where?: OrganizationWhereInput
  }

  export type OrganizationUpdateToOneWithWhereWithoutUsersInput = {
    where?: OrganizationWhereInput
    data: XOR<OrganizationUpdateWithoutUsersInput, OrganizationUncheckedUpdateWithoutUsersInput>
  }

  export type OrganizationUpdateWithoutUsersInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    settings?: NullableJsonNullValueInput | InputJsonValue
    stripeCustomerId?: NullableStringFieldUpdateOperationsInput | string | null
    billingEmail?: NullableStringFieldUpdateOperationsInput | string | null
    trialEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    subscriptions?: SubscriptionUpdateManyWithoutOrganizationNestedInput
    billingEvents?: BillingEventUpdateManyWithoutOrganizationNestedInput
  }

  export type OrganizationUncheckedUpdateWithoutUsersInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    settings?: NullableJsonNullValueInput | InputJsonValue
    stripeCustomerId?: NullableStringFieldUpdateOperationsInput | string | null
    billingEmail?: NullableStringFieldUpdateOperationsInput | string | null
    trialEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    subscriptions?: SubscriptionUncheckedUpdateManyWithoutOrganizationNestedInput
    billingEvents?: BillingEventUncheckedUpdateManyWithoutOrganizationNestedInput
  }

  export type AdminAuditLogCreateWithoutAdminInput = {
    id?: string
    action: string
    resource?: string | null
    resourceType?: string | null
    details?: NullableJsonNullValueInput | InputJsonValue
    ipAddress: string
    userAgent?: string | null
    timestamp?: Date | string
  }

  export type AdminAuditLogUncheckedCreateWithoutAdminInput = {
    id?: string
    action: string
    resource?: string | null
    resourceType?: string | null
    details?: NullableJsonNullValueInput | InputJsonValue
    ipAddress: string
    userAgent?: string | null
    timestamp?: Date | string
  }

  export type AdminAuditLogCreateOrConnectWithoutAdminInput = {
    where: AdminAuditLogWhereUniqueInput
    create: XOR<AdminAuditLogCreateWithoutAdminInput, AdminAuditLogUncheckedCreateWithoutAdminInput>
  }

  export type AdminAuditLogCreateManyAdminInputEnvelope = {
    data: AdminAuditLogCreateManyAdminInput | AdminAuditLogCreateManyAdminInput[]
    skipDuplicates?: boolean
  }

  export type AdminSessionCreateWithoutAdminInput = {
    id?: string
    token: string
    expiresAt: Date | string
    ipAddress?: string | null
    userAgent?: string | null
    isActive?: boolean
    createdAt?: Date | string
  }

  export type AdminSessionUncheckedCreateWithoutAdminInput = {
    id?: string
    token: string
    expiresAt: Date | string
    ipAddress?: string | null
    userAgent?: string | null
    isActive?: boolean
    createdAt?: Date | string
  }

  export type AdminSessionCreateOrConnectWithoutAdminInput = {
    where: AdminSessionWhereUniqueInput
    create: XOR<AdminSessionCreateWithoutAdminInput, AdminSessionUncheckedCreateWithoutAdminInput>
  }

  export type AdminSessionCreateManyAdminInputEnvelope = {
    data: AdminSessionCreateManyAdminInput | AdminSessionCreateManyAdminInput[]
    skipDuplicates?: boolean
  }

  export type AdminAuditLogUpsertWithWhereUniqueWithoutAdminInput = {
    where: AdminAuditLogWhereUniqueInput
    update: XOR<AdminAuditLogUpdateWithoutAdminInput, AdminAuditLogUncheckedUpdateWithoutAdminInput>
    create: XOR<AdminAuditLogCreateWithoutAdminInput, AdminAuditLogUncheckedCreateWithoutAdminInput>
  }

  export type AdminAuditLogUpdateWithWhereUniqueWithoutAdminInput = {
    where: AdminAuditLogWhereUniqueInput
    data: XOR<AdminAuditLogUpdateWithoutAdminInput, AdminAuditLogUncheckedUpdateWithoutAdminInput>
  }

  export type AdminAuditLogUpdateManyWithWhereWithoutAdminInput = {
    where: AdminAuditLogScalarWhereInput
    data: XOR<AdminAuditLogUpdateManyMutationInput, AdminAuditLogUncheckedUpdateManyWithoutAdminInput>
  }

  export type AdminAuditLogScalarWhereInput = {
    AND?: AdminAuditLogScalarWhereInput | AdminAuditLogScalarWhereInput[]
    OR?: AdminAuditLogScalarWhereInput[]
    NOT?: AdminAuditLogScalarWhereInput | AdminAuditLogScalarWhereInput[]
    id?: StringFilter<"AdminAuditLog"> | string
    adminId?: StringFilter<"AdminAuditLog"> | string
    action?: StringFilter<"AdminAuditLog"> | string
    resource?: StringNullableFilter<"AdminAuditLog"> | string | null
    resourceType?: StringNullableFilter<"AdminAuditLog"> | string | null
    details?: JsonNullableFilter<"AdminAuditLog">
    ipAddress?: StringFilter<"AdminAuditLog"> | string
    userAgent?: StringNullableFilter<"AdminAuditLog"> | string | null
    timestamp?: DateTimeFilter<"AdminAuditLog"> | Date | string
  }

  export type AdminSessionUpsertWithWhereUniqueWithoutAdminInput = {
    where: AdminSessionWhereUniqueInput
    update: XOR<AdminSessionUpdateWithoutAdminInput, AdminSessionUncheckedUpdateWithoutAdminInput>
    create: XOR<AdminSessionCreateWithoutAdminInput, AdminSessionUncheckedCreateWithoutAdminInput>
  }

  export type AdminSessionUpdateWithWhereUniqueWithoutAdminInput = {
    where: AdminSessionWhereUniqueInput
    data: XOR<AdminSessionUpdateWithoutAdminInput, AdminSessionUncheckedUpdateWithoutAdminInput>
  }

  export type AdminSessionUpdateManyWithWhereWithoutAdminInput = {
    where: AdminSessionScalarWhereInput
    data: XOR<AdminSessionUpdateManyMutationInput, AdminSessionUncheckedUpdateManyWithoutAdminInput>
  }

  export type AdminSessionScalarWhereInput = {
    AND?: AdminSessionScalarWhereInput | AdminSessionScalarWhereInput[]
    OR?: AdminSessionScalarWhereInput[]
    NOT?: AdminSessionScalarWhereInput | AdminSessionScalarWhereInput[]
    id?: StringFilter<"AdminSession"> | string
    adminId?: StringFilter<"AdminSession"> | string
    token?: StringFilter<"AdminSession"> | string
    expiresAt?: DateTimeFilter<"AdminSession"> | Date | string
    ipAddress?: StringNullableFilter<"AdminSession"> | string | null
    userAgent?: StringNullableFilter<"AdminSession"> | string | null
    isActive?: BoolFilter<"AdminSession"> | boolean
    createdAt?: DateTimeFilter<"AdminSession"> | Date | string
  }

  export type PlatformAdminCreateWithoutAuditLogsInput = {
    id?: string
    email: string
    passwordHash: string
    firstName: string
    lastName: string
    role?: $Enums.AdminRole
    isActive?: boolean
    twoFactorSecret?: string | null
    twoFactorEnabled?: boolean
    twoFactorBackupCodes?: NullableJsonNullValueInput | InputJsonValue
    twoFactorOTP?: NullableJsonNullValueInput | InputJsonValue
    trustedDevices?: NullableJsonNullValueInput | InputJsonValue
    loginAttempts?: number
    lockedUntil?: Date | string | null
    lastLoginAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    sessions?: AdminSessionCreateNestedManyWithoutAdminInput
  }

  export type PlatformAdminUncheckedCreateWithoutAuditLogsInput = {
    id?: string
    email: string
    passwordHash: string
    firstName: string
    lastName: string
    role?: $Enums.AdminRole
    isActive?: boolean
    twoFactorSecret?: string | null
    twoFactorEnabled?: boolean
    twoFactorBackupCodes?: NullableJsonNullValueInput | InputJsonValue
    twoFactorOTP?: NullableJsonNullValueInput | InputJsonValue
    trustedDevices?: NullableJsonNullValueInput | InputJsonValue
    loginAttempts?: number
    lockedUntil?: Date | string | null
    lastLoginAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    sessions?: AdminSessionUncheckedCreateNestedManyWithoutAdminInput
  }

  export type PlatformAdminCreateOrConnectWithoutAuditLogsInput = {
    where: PlatformAdminWhereUniqueInput
    create: XOR<PlatformAdminCreateWithoutAuditLogsInput, PlatformAdminUncheckedCreateWithoutAuditLogsInput>
  }

  export type PlatformAdminUpsertWithoutAuditLogsInput = {
    update: XOR<PlatformAdminUpdateWithoutAuditLogsInput, PlatformAdminUncheckedUpdateWithoutAuditLogsInput>
    create: XOR<PlatformAdminCreateWithoutAuditLogsInput, PlatformAdminUncheckedCreateWithoutAuditLogsInput>
    where?: PlatformAdminWhereInput
  }

  export type PlatformAdminUpdateToOneWithWhereWithoutAuditLogsInput = {
    where?: PlatformAdminWhereInput
    data: XOR<PlatformAdminUpdateWithoutAuditLogsInput, PlatformAdminUncheckedUpdateWithoutAuditLogsInput>
  }

  export type PlatformAdminUpdateWithoutAuditLogsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    role?: EnumAdminRoleFieldUpdateOperationsInput | $Enums.AdminRole
    isActive?: BoolFieldUpdateOperationsInput | boolean
    twoFactorSecret?: NullableStringFieldUpdateOperationsInput | string | null
    twoFactorEnabled?: BoolFieldUpdateOperationsInput | boolean
    twoFactorBackupCodes?: NullableJsonNullValueInput | InputJsonValue
    twoFactorOTP?: NullableJsonNullValueInput | InputJsonValue
    trustedDevices?: NullableJsonNullValueInput | InputJsonValue
    loginAttempts?: IntFieldUpdateOperationsInput | number
    lockedUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sessions?: AdminSessionUpdateManyWithoutAdminNestedInput
  }

  export type PlatformAdminUncheckedUpdateWithoutAuditLogsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    role?: EnumAdminRoleFieldUpdateOperationsInput | $Enums.AdminRole
    isActive?: BoolFieldUpdateOperationsInput | boolean
    twoFactorSecret?: NullableStringFieldUpdateOperationsInput | string | null
    twoFactorEnabled?: BoolFieldUpdateOperationsInput | boolean
    twoFactorBackupCodes?: NullableJsonNullValueInput | InputJsonValue
    twoFactorOTP?: NullableJsonNullValueInput | InputJsonValue
    trustedDevices?: NullableJsonNullValueInput | InputJsonValue
    loginAttempts?: IntFieldUpdateOperationsInput | number
    lockedUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sessions?: AdminSessionUncheckedUpdateManyWithoutAdminNestedInput
  }

  export type PlatformAdminCreateWithoutSessionsInput = {
    id?: string
    email: string
    passwordHash: string
    firstName: string
    lastName: string
    role?: $Enums.AdminRole
    isActive?: boolean
    twoFactorSecret?: string | null
    twoFactorEnabled?: boolean
    twoFactorBackupCodes?: NullableJsonNullValueInput | InputJsonValue
    twoFactorOTP?: NullableJsonNullValueInput | InputJsonValue
    trustedDevices?: NullableJsonNullValueInput | InputJsonValue
    loginAttempts?: number
    lockedUntil?: Date | string | null
    lastLoginAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    auditLogs?: AdminAuditLogCreateNestedManyWithoutAdminInput
  }

  export type PlatformAdminUncheckedCreateWithoutSessionsInput = {
    id?: string
    email: string
    passwordHash: string
    firstName: string
    lastName: string
    role?: $Enums.AdminRole
    isActive?: boolean
    twoFactorSecret?: string | null
    twoFactorEnabled?: boolean
    twoFactorBackupCodes?: NullableJsonNullValueInput | InputJsonValue
    twoFactorOTP?: NullableJsonNullValueInput | InputJsonValue
    trustedDevices?: NullableJsonNullValueInput | InputJsonValue
    loginAttempts?: number
    lockedUntil?: Date | string | null
    lastLoginAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    auditLogs?: AdminAuditLogUncheckedCreateNestedManyWithoutAdminInput
  }

  export type PlatformAdminCreateOrConnectWithoutSessionsInput = {
    where: PlatformAdminWhereUniqueInput
    create: XOR<PlatformAdminCreateWithoutSessionsInput, PlatformAdminUncheckedCreateWithoutSessionsInput>
  }

  export type PlatformAdminUpsertWithoutSessionsInput = {
    update: XOR<PlatformAdminUpdateWithoutSessionsInput, PlatformAdminUncheckedUpdateWithoutSessionsInput>
    create: XOR<PlatformAdminCreateWithoutSessionsInput, PlatformAdminUncheckedCreateWithoutSessionsInput>
    where?: PlatformAdminWhereInput
  }

  export type PlatformAdminUpdateToOneWithWhereWithoutSessionsInput = {
    where?: PlatformAdminWhereInput
    data: XOR<PlatformAdminUpdateWithoutSessionsInput, PlatformAdminUncheckedUpdateWithoutSessionsInput>
  }

  export type PlatformAdminUpdateWithoutSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    role?: EnumAdminRoleFieldUpdateOperationsInput | $Enums.AdminRole
    isActive?: BoolFieldUpdateOperationsInput | boolean
    twoFactorSecret?: NullableStringFieldUpdateOperationsInput | string | null
    twoFactorEnabled?: BoolFieldUpdateOperationsInput | boolean
    twoFactorBackupCodes?: NullableJsonNullValueInput | InputJsonValue
    twoFactorOTP?: NullableJsonNullValueInput | InputJsonValue
    trustedDevices?: NullableJsonNullValueInput | InputJsonValue
    loginAttempts?: IntFieldUpdateOperationsInput | number
    lockedUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    auditLogs?: AdminAuditLogUpdateManyWithoutAdminNestedInput
  }

  export type PlatformAdminUncheckedUpdateWithoutSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    role?: EnumAdminRoleFieldUpdateOperationsInput | $Enums.AdminRole
    isActive?: BoolFieldUpdateOperationsInput | boolean
    twoFactorSecret?: NullableStringFieldUpdateOperationsInput | string | null
    twoFactorEnabled?: BoolFieldUpdateOperationsInput | boolean
    twoFactorBackupCodes?: NullableJsonNullValueInput | InputJsonValue
    twoFactorOTP?: NullableJsonNullValueInput | InputJsonValue
    trustedDevices?: NullableJsonNullValueInput | InputJsonValue
    loginAttempts?: IntFieldUpdateOperationsInput | number
    lockedUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    auditLogs?: AdminAuditLogUncheckedUpdateManyWithoutAdminNestedInput
  }

  export type OrganizationCreateWithoutSubscriptionsInput = {
    id?: string
    name: string
    slug: string
    isActive?: boolean
    settings?: NullableJsonNullValueInput | InputJsonValue
    stripeCustomerId?: string | null
    billingEmail?: string | null
    trialEndsAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    users?: UserCreateNestedManyWithoutOrganizationInput
    billingEvents?: BillingEventCreateNestedManyWithoutOrganizationInput
  }

  export type OrganizationUncheckedCreateWithoutSubscriptionsInput = {
    id?: string
    name: string
    slug: string
    isActive?: boolean
    settings?: NullableJsonNullValueInput | InputJsonValue
    stripeCustomerId?: string | null
    billingEmail?: string | null
    trialEndsAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    users?: UserUncheckedCreateNestedManyWithoutOrganizationInput
    billingEvents?: BillingEventUncheckedCreateNestedManyWithoutOrganizationInput
  }

  export type OrganizationCreateOrConnectWithoutSubscriptionsInput = {
    where: OrganizationWhereUniqueInput
    create: XOR<OrganizationCreateWithoutSubscriptionsInput, OrganizationUncheckedCreateWithoutSubscriptionsInput>
  }

  export type BillingEventCreateWithoutSubscriptionInput = {
    id?: string
    stripeEventId?: string | null
    eventType: $Enums.BillingEventType
    amount?: Decimal | DecimalJsLike | number | string | null
    currency?: string | null
    description?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    processedAt?: Date | string | null
    createdAt?: Date | string
    organization: OrganizationCreateNestedOneWithoutBillingEventsInput
  }

  export type BillingEventUncheckedCreateWithoutSubscriptionInput = {
    id?: string
    organizationId: string
    stripeEventId?: string | null
    eventType: $Enums.BillingEventType
    amount?: Decimal | DecimalJsLike | number | string | null
    currency?: string | null
    description?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    processedAt?: Date | string | null
    createdAt?: Date | string
  }

  export type BillingEventCreateOrConnectWithoutSubscriptionInput = {
    where: BillingEventWhereUniqueInput
    create: XOR<BillingEventCreateWithoutSubscriptionInput, BillingEventUncheckedCreateWithoutSubscriptionInput>
  }

  export type BillingEventCreateManySubscriptionInputEnvelope = {
    data: BillingEventCreateManySubscriptionInput | BillingEventCreateManySubscriptionInput[]
    skipDuplicates?: boolean
  }

  export type OrganizationUpsertWithoutSubscriptionsInput = {
    update: XOR<OrganizationUpdateWithoutSubscriptionsInput, OrganizationUncheckedUpdateWithoutSubscriptionsInput>
    create: XOR<OrganizationCreateWithoutSubscriptionsInput, OrganizationUncheckedCreateWithoutSubscriptionsInput>
    where?: OrganizationWhereInput
  }

  export type OrganizationUpdateToOneWithWhereWithoutSubscriptionsInput = {
    where?: OrganizationWhereInput
    data: XOR<OrganizationUpdateWithoutSubscriptionsInput, OrganizationUncheckedUpdateWithoutSubscriptionsInput>
  }

  export type OrganizationUpdateWithoutSubscriptionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    settings?: NullableJsonNullValueInput | InputJsonValue
    stripeCustomerId?: NullableStringFieldUpdateOperationsInput | string | null
    billingEmail?: NullableStringFieldUpdateOperationsInput | string | null
    trialEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    users?: UserUpdateManyWithoutOrganizationNestedInput
    billingEvents?: BillingEventUpdateManyWithoutOrganizationNestedInput
  }

  export type OrganizationUncheckedUpdateWithoutSubscriptionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    settings?: NullableJsonNullValueInput | InputJsonValue
    stripeCustomerId?: NullableStringFieldUpdateOperationsInput | string | null
    billingEmail?: NullableStringFieldUpdateOperationsInput | string | null
    trialEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    users?: UserUncheckedUpdateManyWithoutOrganizationNestedInput
    billingEvents?: BillingEventUncheckedUpdateManyWithoutOrganizationNestedInput
  }

  export type BillingEventUpsertWithWhereUniqueWithoutSubscriptionInput = {
    where: BillingEventWhereUniqueInput
    update: XOR<BillingEventUpdateWithoutSubscriptionInput, BillingEventUncheckedUpdateWithoutSubscriptionInput>
    create: XOR<BillingEventCreateWithoutSubscriptionInput, BillingEventUncheckedCreateWithoutSubscriptionInput>
  }

  export type BillingEventUpdateWithWhereUniqueWithoutSubscriptionInput = {
    where: BillingEventWhereUniqueInput
    data: XOR<BillingEventUpdateWithoutSubscriptionInput, BillingEventUncheckedUpdateWithoutSubscriptionInput>
  }

  export type BillingEventUpdateManyWithWhereWithoutSubscriptionInput = {
    where: BillingEventScalarWhereInput
    data: XOR<BillingEventUpdateManyMutationInput, BillingEventUncheckedUpdateManyWithoutSubscriptionInput>
  }

  export type OrganizationCreateWithoutBillingEventsInput = {
    id?: string
    name: string
    slug: string
    isActive?: boolean
    settings?: NullableJsonNullValueInput | InputJsonValue
    stripeCustomerId?: string | null
    billingEmail?: string | null
    trialEndsAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    users?: UserCreateNestedManyWithoutOrganizationInput
    subscriptions?: SubscriptionCreateNestedManyWithoutOrganizationInput
  }

  export type OrganizationUncheckedCreateWithoutBillingEventsInput = {
    id?: string
    name: string
    slug: string
    isActive?: boolean
    settings?: NullableJsonNullValueInput | InputJsonValue
    stripeCustomerId?: string | null
    billingEmail?: string | null
    trialEndsAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    users?: UserUncheckedCreateNestedManyWithoutOrganizationInput
    subscriptions?: SubscriptionUncheckedCreateNestedManyWithoutOrganizationInput
  }

  export type OrganizationCreateOrConnectWithoutBillingEventsInput = {
    where: OrganizationWhereUniqueInput
    create: XOR<OrganizationCreateWithoutBillingEventsInput, OrganizationUncheckedCreateWithoutBillingEventsInput>
  }

  export type SubscriptionCreateWithoutBillingEventsInput = {
    id?: string
    stripeSubscriptionId?: string | null
    stripePriceId?: string | null
    plan: $Enums.SubscriptionPlan
    status: $Enums.SubscriptionStatus
    currentPeriodStart: Date | string
    currentPeriodEnd: Date | string
    trialStart?: Date | string | null
    trialEnd?: Date | string | null
    canceledAt?: Date | string | null
    cancelAtPeriodEnd?: boolean
    monthlyRevenue?: Decimal | DecimalJsLike | number | string | null
    yearlyRevenue?: Decimal | DecimalJsLike | number | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    organization: OrganizationCreateNestedOneWithoutSubscriptionsInput
  }

  export type SubscriptionUncheckedCreateWithoutBillingEventsInput = {
    id?: string
    organizationId: string
    stripeSubscriptionId?: string | null
    stripePriceId?: string | null
    plan: $Enums.SubscriptionPlan
    status: $Enums.SubscriptionStatus
    currentPeriodStart: Date | string
    currentPeriodEnd: Date | string
    trialStart?: Date | string | null
    trialEnd?: Date | string | null
    canceledAt?: Date | string | null
    cancelAtPeriodEnd?: boolean
    monthlyRevenue?: Decimal | DecimalJsLike | number | string | null
    yearlyRevenue?: Decimal | DecimalJsLike | number | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SubscriptionCreateOrConnectWithoutBillingEventsInput = {
    where: SubscriptionWhereUniqueInput
    create: XOR<SubscriptionCreateWithoutBillingEventsInput, SubscriptionUncheckedCreateWithoutBillingEventsInput>
  }

  export type OrganizationUpsertWithoutBillingEventsInput = {
    update: XOR<OrganizationUpdateWithoutBillingEventsInput, OrganizationUncheckedUpdateWithoutBillingEventsInput>
    create: XOR<OrganizationCreateWithoutBillingEventsInput, OrganizationUncheckedCreateWithoutBillingEventsInput>
    where?: OrganizationWhereInput
  }

  export type OrganizationUpdateToOneWithWhereWithoutBillingEventsInput = {
    where?: OrganizationWhereInput
    data: XOR<OrganizationUpdateWithoutBillingEventsInput, OrganizationUncheckedUpdateWithoutBillingEventsInput>
  }

  export type OrganizationUpdateWithoutBillingEventsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    settings?: NullableJsonNullValueInput | InputJsonValue
    stripeCustomerId?: NullableStringFieldUpdateOperationsInput | string | null
    billingEmail?: NullableStringFieldUpdateOperationsInput | string | null
    trialEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    users?: UserUpdateManyWithoutOrganizationNestedInput
    subscriptions?: SubscriptionUpdateManyWithoutOrganizationNestedInput
  }

  export type OrganizationUncheckedUpdateWithoutBillingEventsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    settings?: NullableJsonNullValueInput | InputJsonValue
    stripeCustomerId?: NullableStringFieldUpdateOperationsInput | string | null
    billingEmail?: NullableStringFieldUpdateOperationsInput | string | null
    trialEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    users?: UserUncheckedUpdateManyWithoutOrganizationNestedInput
    subscriptions?: SubscriptionUncheckedUpdateManyWithoutOrganizationNestedInput
  }

  export type SubscriptionUpsertWithoutBillingEventsInput = {
    update: XOR<SubscriptionUpdateWithoutBillingEventsInput, SubscriptionUncheckedUpdateWithoutBillingEventsInput>
    create: XOR<SubscriptionCreateWithoutBillingEventsInput, SubscriptionUncheckedCreateWithoutBillingEventsInput>
    where?: SubscriptionWhereInput
  }

  export type SubscriptionUpdateToOneWithWhereWithoutBillingEventsInput = {
    where?: SubscriptionWhereInput
    data: XOR<SubscriptionUpdateWithoutBillingEventsInput, SubscriptionUncheckedUpdateWithoutBillingEventsInput>
  }

  export type SubscriptionUpdateWithoutBillingEventsInput = {
    id?: StringFieldUpdateOperationsInput | string
    stripeSubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    stripePriceId?: NullableStringFieldUpdateOperationsInput | string | null
    plan?: EnumSubscriptionPlanFieldUpdateOperationsInput | $Enums.SubscriptionPlan
    status?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    currentPeriodStart?: DateTimeFieldUpdateOperationsInput | Date | string
    currentPeriodEnd?: DateTimeFieldUpdateOperationsInput | Date | string
    trialStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    trialEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    canceledAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelAtPeriodEnd?: BoolFieldUpdateOperationsInput | boolean
    monthlyRevenue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    yearlyRevenue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    organization?: OrganizationUpdateOneRequiredWithoutSubscriptionsNestedInput
  }

  export type SubscriptionUncheckedUpdateWithoutBillingEventsInput = {
    id?: StringFieldUpdateOperationsInput | string
    organizationId?: StringFieldUpdateOperationsInput | string
    stripeSubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    stripePriceId?: NullableStringFieldUpdateOperationsInput | string | null
    plan?: EnumSubscriptionPlanFieldUpdateOperationsInput | $Enums.SubscriptionPlan
    status?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    currentPeriodStart?: DateTimeFieldUpdateOperationsInput | Date | string
    currentPeriodEnd?: DateTimeFieldUpdateOperationsInput | Date | string
    trialStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    trialEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    canceledAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelAtPeriodEnd?: BoolFieldUpdateOperationsInput | boolean
    monthlyRevenue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    yearlyRevenue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserCreateManyOrganizationInput = {
    id?: string
    email: string
    password?: string | null
    firstName: string
    lastName: string
    phone?: string | null
    phoneCarrier?: string | null
    role?: string
    accountSetupToken?: string | null
    accountSetupTokenExpires?: Date | string | null
    twoFactorSecret?: string | null
    twoFactorBackupCodes?: NullableJsonNullValueInput | InputJsonValue
    twoFactorEnabledAt?: Date | string | null
    twoFactorOTP?: NullableJsonNullValueInput | InputJsonValue
    trustedDevices?: NullableJsonNullValueInput | InputJsonValue
    isActive?: boolean
    isEmailVerified?: boolean
    lastLoginAt?: Date | string | null
    loginAttempts?: number
    lockedUntil?: Date | string | null
    passwordResetToken?: string | null
    passwordResetTokenExpires?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SubscriptionCreateManyOrganizationInput = {
    id?: string
    stripeSubscriptionId?: string | null
    stripePriceId?: string | null
    plan: $Enums.SubscriptionPlan
    status: $Enums.SubscriptionStatus
    currentPeriodStart: Date | string
    currentPeriodEnd: Date | string
    trialStart?: Date | string | null
    trialEnd?: Date | string | null
    canceledAt?: Date | string | null
    cancelAtPeriodEnd?: boolean
    monthlyRevenue?: Decimal | DecimalJsLike | number | string | null
    yearlyRevenue?: Decimal | DecimalJsLike | number | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type BillingEventCreateManyOrganizationInput = {
    id?: string
    subscriptionId?: string | null
    stripeEventId?: string | null
    eventType: $Enums.BillingEventType
    amount?: Decimal | DecimalJsLike | number | string | null
    currency?: string | null
    description?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    processedAt?: Date | string | null
    createdAt?: Date | string
  }

  export type UserUpdateWithoutOrganizationInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    phoneCarrier?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    accountSetupToken?: NullableStringFieldUpdateOperationsInput | string | null
    accountSetupTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    twoFactorSecret?: NullableStringFieldUpdateOperationsInput | string | null
    twoFactorBackupCodes?: NullableJsonNullValueInput | InputJsonValue
    twoFactorEnabledAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    twoFactorOTP?: NullableJsonNullValueInput | InputJsonValue
    trustedDevices?: NullableJsonNullValueInput | InputJsonValue
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isEmailVerified?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    loginAttempts?: IntFieldUpdateOperationsInput | number
    lockedUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    passwordResetToken?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateWithoutOrganizationInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    phoneCarrier?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    accountSetupToken?: NullableStringFieldUpdateOperationsInput | string | null
    accountSetupTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    twoFactorSecret?: NullableStringFieldUpdateOperationsInput | string | null
    twoFactorBackupCodes?: NullableJsonNullValueInput | InputJsonValue
    twoFactorEnabledAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    twoFactorOTP?: NullableJsonNullValueInput | InputJsonValue
    trustedDevices?: NullableJsonNullValueInput | InputJsonValue
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isEmailVerified?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    loginAttempts?: IntFieldUpdateOperationsInput | number
    lockedUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    passwordResetToken?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyWithoutOrganizationInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    phoneCarrier?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    accountSetupToken?: NullableStringFieldUpdateOperationsInput | string | null
    accountSetupTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    twoFactorSecret?: NullableStringFieldUpdateOperationsInput | string | null
    twoFactorBackupCodes?: NullableJsonNullValueInput | InputJsonValue
    twoFactorEnabledAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    twoFactorOTP?: NullableJsonNullValueInput | InputJsonValue
    trustedDevices?: NullableJsonNullValueInput | InputJsonValue
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isEmailVerified?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    loginAttempts?: IntFieldUpdateOperationsInput | number
    lockedUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    passwordResetToken?: NullableStringFieldUpdateOperationsInput | string | null
    passwordResetTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SubscriptionUpdateWithoutOrganizationInput = {
    id?: StringFieldUpdateOperationsInput | string
    stripeSubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    stripePriceId?: NullableStringFieldUpdateOperationsInput | string | null
    plan?: EnumSubscriptionPlanFieldUpdateOperationsInput | $Enums.SubscriptionPlan
    status?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    currentPeriodStart?: DateTimeFieldUpdateOperationsInput | Date | string
    currentPeriodEnd?: DateTimeFieldUpdateOperationsInput | Date | string
    trialStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    trialEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    canceledAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelAtPeriodEnd?: BoolFieldUpdateOperationsInput | boolean
    monthlyRevenue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    yearlyRevenue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    billingEvents?: BillingEventUpdateManyWithoutSubscriptionNestedInput
  }

  export type SubscriptionUncheckedUpdateWithoutOrganizationInput = {
    id?: StringFieldUpdateOperationsInput | string
    stripeSubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    stripePriceId?: NullableStringFieldUpdateOperationsInput | string | null
    plan?: EnumSubscriptionPlanFieldUpdateOperationsInput | $Enums.SubscriptionPlan
    status?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    currentPeriodStart?: DateTimeFieldUpdateOperationsInput | Date | string
    currentPeriodEnd?: DateTimeFieldUpdateOperationsInput | Date | string
    trialStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    trialEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    canceledAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelAtPeriodEnd?: BoolFieldUpdateOperationsInput | boolean
    monthlyRevenue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    yearlyRevenue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    billingEvents?: BillingEventUncheckedUpdateManyWithoutSubscriptionNestedInput
  }

  export type SubscriptionUncheckedUpdateManyWithoutOrganizationInput = {
    id?: StringFieldUpdateOperationsInput | string
    stripeSubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    stripePriceId?: NullableStringFieldUpdateOperationsInput | string | null
    plan?: EnumSubscriptionPlanFieldUpdateOperationsInput | $Enums.SubscriptionPlan
    status?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    currentPeriodStart?: DateTimeFieldUpdateOperationsInput | Date | string
    currentPeriodEnd?: DateTimeFieldUpdateOperationsInput | Date | string
    trialStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    trialEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    canceledAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelAtPeriodEnd?: BoolFieldUpdateOperationsInput | boolean
    monthlyRevenue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    yearlyRevenue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BillingEventUpdateWithoutOrganizationInput = {
    id?: StringFieldUpdateOperationsInput | string
    stripeEventId?: NullableStringFieldUpdateOperationsInput | string | null
    eventType?: EnumBillingEventTypeFieldUpdateOperationsInput | $Enums.BillingEventType
    amount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    subscription?: SubscriptionUpdateOneWithoutBillingEventsNestedInput
  }

  export type BillingEventUncheckedUpdateWithoutOrganizationInput = {
    id?: StringFieldUpdateOperationsInput | string
    subscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    stripeEventId?: NullableStringFieldUpdateOperationsInput | string | null
    eventType?: EnumBillingEventTypeFieldUpdateOperationsInput | $Enums.BillingEventType
    amount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BillingEventUncheckedUpdateManyWithoutOrganizationInput = {
    id?: StringFieldUpdateOperationsInput | string
    subscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    stripeEventId?: NullableStringFieldUpdateOperationsInput | string | null
    eventType?: EnumBillingEventTypeFieldUpdateOperationsInput | $Enums.BillingEventType
    amount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AdminAuditLogCreateManyAdminInput = {
    id?: string
    action: string
    resource?: string | null
    resourceType?: string | null
    details?: NullableJsonNullValueInput | InputJsonValue
    ipAddress: string
    userAgent?: string | null
    timestamp?: Date | string
  }

  export type AdminSessionCreateManyAdminInput = {
    id?: string
    token: string
    expiresAt: Date | string
    ipAddress?: string | null
    userAgent?: string | null
    isActive?: boolean
    createdAt?: Date | string
  }

  export type AdminAuditLogUpdateWithoutAdminInput = {
    id?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    resource?: NullableStringFieldUpdateOperationsInput | string | null
    resourceType?: NullableStringFieldUpdateOperationsInput | string | null
    details?: NullableJsonNullValueInput | InputJsonValue
    ipAddress?: StringFieldUpdateOperationsInput | string
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AdminAuditLogUncheckedUpdateWithoutAdminInput = {
    id?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    resource?: NullableStringFieldUpdateOperationsInput | string | null
    resourceType?: NullableStringFieldUpdateOperationsInput | string | null
    details?: NullableJsonNullValueInput | InputJsonValue
    ipAddress?: StringFieldUpdateOperationsInput | string
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AdminAuditLogUncheckedUpdateManyWithoutAdminInput = {
    id?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    resource?: NullableStringFieldUpdateOperationsInput | string | null
    resourceType?: NullableStringFieldUpdateOperationsInput | string | null
    details?: NullableJsonNullValueInput | InputJsonValue
    ipAddress?: StringFieldUpdateOperationsInput | string
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AdminSessionUpdateWithoutAdminInput = {
    id?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AdminSessionUncheckedUpdateWithoutAdminInput = {
    id?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AdminSessionUncheckedUpdateManyWithoutAdminInput = {
    id?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BillingEventCreateManySubscriptionInput = {
    id?: string
    organizationId: string
    stripeEventId?: string | null
    eventType: $Enums.BillingEventType
    amount?: Decimal | DecimalJsLike | number | string | null
    currency?: string | null
    description?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    processedAt?: Date | string | null
    createdAt?: Date | string
  }

  export type BillingEventUpdateWithoutSubscriptionInput = {
    id?: StringFieldUpdateOperationsInput | string
    stripeEventId?: NullableStringFieldUpdateOperationsInput | string | null
    eventType?: EnumBillingEventTypeFieldUpdateOperationsInput | $Enums.BillingEventType
    amount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    organization?: OrganizationUpdateOneRequiredWithoutBillingEventsNestedInput
  }

  export type BillingEventUncheckedUpdateWithoutSubscriptionInput = {
    id?: StringFieldUpdateOperationsInput | string
    organizationId?: StringFieldUpdateOperationsInput | string
    stripeEventId?: NullableStringFieldUpdateOperationsInput | string | null
    eventType?: EnumBillingEventTypeFieldUpdateOperationsInput | $Enums.BillingEventType
    amount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BillingEventUncheckedUpdateManyWithoutSubscriptionInput = {
    id?: StringFieldUpdateOperationsInput | string
    organizationId?: StringFieldUpdateOperationsInput | string
    stripeEventId?: NullableStringFieldUpdateOperationsInput | string | null
    eventType?: EnumBillingEventTypeFieldUpdateOperationsInput | $Enums.BillingEventType
    amount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}