# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NoticeEvent < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::NoticeEventPostPublished }, key: "POST_PUBLISHED"

      member -> { Peal::Types::NoticeEventPostFailed }, key: "POST_FAILED"

      member -> { Peal::Types::NoticeEventPostUnconfirmed }, key: "POST_UNCONFIRMED"

      member -> { Peal::Types::NoticeEventPostApprovalRequested }, key: "POST_APPROVAL_REQUESTED"

      member -> { Peal::Types::NoticeEventPostApproved }, key: "POST_APPROVED"

      member -> { Peal::Types::NoticeEventPostChangesRequested }, key: "POST_CHANGES_REQUESTED"

      member -> { Peal::Types::NoticeEventPostCommented }, key: "POST_COMMENTED"

      member -> { Peal::Types::NoticeEventChannelReconnectRequired }, key: "CHANNEL_RECONNECT_REQUIRED"

      member -> { Peal::Types::NoticeEventChannelReconnectSoon }, key: "CHANNEL_RECONNECT_SOON"

      member -> { Peal::Types::NoticeEventSubscriptionStarted }, key: "SUBSCRIPTION_STARTED"

      member -> { Peal::Types::NoticeEventTrialEnding }, key: "TRIAL_ENDING"

      member -> { Peal::Types::NoticeEventSubscriptionRenewing }, key: "SUBSCRIPTION_RENEWING"

      member -> { Peal::Types::NoticeEventSubscriptionCancelled }, key: "SUBSCRIPTION_CANCELLED"

      member -> { Peal::Types::NoticeEventSubscriptionWithdrawn }, key: "SUBSCRIPTION_WITHDRAWN"

      member -> { Peal::Types::NoticeEventWebhookEndpointDisabled }, key: "WEBHOOK_ENDPOINT_DISABLED"

      member -> { Peal::Types::NoticeEventAdBoostChanged }, key: "AD_BOOST_CHANGED"

      member -> { Peal::Types::NoticeEventAdConnectionReconnectRequired }, key: "AD_CONNECTION_RECONNECT_REQUIRED"
    end
  end
end
