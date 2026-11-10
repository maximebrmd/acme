import { Schema } from "effect";

// The shapes of the Marketing API's answers, as its reference documents
// them. Amounts and counts come as numeric strings; fields an object does
// not have are left out.

const paging = Schema.optionalKey(
  Schema.Struct({
    cursors: Schema.optionalKey(
      Schema.Struct({ after: Schema.optionalKey(Schema.String) })
    ),
    next: Schema.optionalKey(Schema.String),
  })
);

/** A page of a listing. */
export const listOf = <A, I>(item: Schema.Codec<A, I>) =>
  Schema.Struct({ data: Schema.Array(item), paging });

export const TokenSchema = Schema.Struct({
  access_token: Schema.NonEmptyString,
  expires_in: Schema.optionalKey(Schema.Number),
});

export const UserSchema = Schema.Struct({ id: Schema.NonEmptyString });

export const PermissionsSchema = Schema.Struct({
  data: Schema.Array(
    Schema.Struct({ permission: Schema.String, status: Schema.String })
  ),
});

// "Ad Account" reference: `account_id` is the id without `act_`,
// `account_status` a number, `spend_cap` and `amount_spent` numeric strings.
export const AccountSchema = Schema.Struct({
  account_id: Schema.NonEmptyString,
  account_status: Schema.optionalKey(Schema.Number),
  amount_spent: Schema.optionalKey(Schema.String),
  currency: Schema.String,
  name: Schema.optionalKey(Schema.String),
  spend_cap: Schema.optionalKey(Schema.String),
  timezone_name: Schema.optionalKey(Schema.String),
});

export const accountFields =
  "account_id,name,currency,timezone_name,account_status,spend_cap,amount_spent";

const budget = {
  daily_budget: Schema.optionalKey(Schema.String),
  lifetime_budget: Schema.optionalKey(Schema.String),
};

const state = {
  effective_status: Schema.optionalKey(Schema.String),
  id: Schema.NonEmptyString,
  name: Schema.optionalKey(Schema.String),
  status: Schema.optionalKey(Schema.String),
};

export const CampaignSchema = Schema.Struct({
  ...state,
  ...budget,
  objective: Schema.optionalKey(Schema.String),
  start_time: Schema.optionalKey(Schema.String),
  stop_time: Schema.optionalKey(Schema.String),
});

export const campaignFields =
  "id,name,objective,status,effective_status,daily_budget,lifetime_budget,start_time,stop_time";

export const AdSetSchema = Schema.Struct({
  ...state,
  ...budget,
  campaign_id: Schema.NonEmptyString,
  end_time: Schema.optionalKey(Schema.String),
  start_time: Schema.optionalKey(Schema.String),
});

export const adSetFields =
  "id,name,campaign_id,status,effective_status,daily_budget,lifetime_budget,start_time,end_time";

export const AdSchema = Schema.Struct({
  ...state,
  adset_id: Schema.NonEmptyString,
  campaign_id: Schema.NonEmptyString,
  creative: Schema.optionalKey(
    Schema.Struct({
      effective_instagram_media_id: Schema.optionalKey(Schema.String),
      effective_object_story_id: Schema.optionalKey(Schema.String),
    })
  ),
});

export const adFields =
  "id,name,adset_id,campaign_id,status,effective_status,creative{effective_object_story_id,effective_instagram_media_id}";

// "Insights" reference: every value is a string, `actions` a list of an
// action's type and its count.
export const InsightSchema = Schema.Struct({
  actions: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({ action_type: Schema.String, value: Schema.String })
    )
  ),
  ad_id: Schema.NonEmptyString,
  clicks: Schema.optionalKey(Schema.String),
  date_start: Schema.String,
  impressions: Schema.optionalKey(Schema.String),
  reach: Schema.optionalKey(Schema.String),
  spend: Schema.optionalKey(Schema.String),
});

export const insightFields = "ad_id,spend,impressions,reach,clicks,actions";

export const CreatedSchema = Schema.Struct({ id: Schema.NonEmptyString });

export const UpdatedSchema = Schema.Struct({
  success: Schema.optionalKey(Schema.Boolean),
});

export const NamedSchema = Schema.Struct({
  id: Schema.NonEmptyString,
  name: Schema.optionalKey(Schema.String),
});

export const StatusSchema = Schema.Struct({
  status: Schema.optionalKey(Schema.String),
});

export const PageSchema = Schema.Struct({
  id: Schema.NonEmptyString,
  instagram_business_account: Schema.optionalKey(
    Schema.Struct({ id: Schema.NonEmptyString })
  ),
});
