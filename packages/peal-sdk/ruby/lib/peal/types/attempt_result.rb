# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module AttemptResult
      extend Peal::Internal::Types::Enum

      PUBLISHED = "published"
      UNCONFIRMED = "unconfirmed"
      CONTENT_REJECTED = "contentRejected"
      CHANNEL_DISCONNECTED = "channelDisconnected"
      CHANNEL_DISABLED = "channelDisabled"
      MEDIA_REMOVED = "mediaRemoved"
      MEDIA_REJECTED = "mediaRejected"
      RATE_LIMITED = "rateLimited"
      TOKEN_EXPIRED = "tokenExpired"
      UNAVAILABLE = "unavailable"
      APP_NOT_AUDITED = "appNotAudited"
      QUOTA_EXCEEDED = "quotaExceeded"
      APP_BILLING_LIMIT = "appBillingLimit"
      PLAN_LIMIT = "planLimit"
      PARTS_NOT_SENT = "partsNotSent"
      REPLIES_NOT_ALLOWED = "repliesNotAllowed"
      PAYMENT_METHOD_REQUIRED = "paymentMethodRequired"
      X_CEILING_REACHED = "xCeilingReached"
    end
  end
end
