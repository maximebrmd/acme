# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module FailureReason
      extend Peal::Internal::Types::Enum

      CONTENT_REJECTED = "contentRejected"
      CHANNEL_DISCONNECTED = "channelDisconnected"
      CHANNEL_DISABLED = "channelDisabled"
      MEDIA_REMOVED = "mediaRemoved"
      MEDIA_REJECTED = "mediaRejected"
      MISSED = "missed"
      NOT_PUBLISHED = "notPublished"
      RATE_LIMITED = "rateLimited"
      TOKEN_EXPIRED = "tokenExpired"
      UNAVAILABLE = "unavailable"
      APP_NOT_AUDITED = "appNotAudited"
      QUOTA_EXCEEDED = "quotaExceeded"
    end
  end
end
