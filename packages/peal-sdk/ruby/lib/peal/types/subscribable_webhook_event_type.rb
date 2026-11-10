# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module SubscribableWebhookEventType
      extend Peal::Internal::Types::Enum

      POST_SCHEDULED = "post.scheduled"
      POST_UNSCHEDULED = "post.unscheduled"
      POST_PUBLISHED = "post.published"
      POST_FAILED = "post.failed"
      POST_UNCONFIRMED = "post.unconfirmed"
      POST_CANCELLED = "post.cancelled"
      POST_APPROVAL_REQUESTED = "post.approval_requested"
      POST_APPROVED = "post.approved"
      POST_CHANGES_REQUESTED = "post.changes_requested"
      CHANNEL_CONNECTED = "channel.connected"
      CHANNEL_DISCONNECTED = "channel.disconnected"
      CHANNEL_RECONNECT_NEEDED = "channel.reconnect_needed"
      MEDIA_READY = "media.ready"
      MEDIA_FAILED = "media.failed"
    end
  end
end
