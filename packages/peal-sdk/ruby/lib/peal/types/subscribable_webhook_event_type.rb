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
      POST_FINISHED = "post.finished"
      POST_UNPUBLISHED = "post.unpublished"
      POST_UNPUBLISH_FAILED = "post.unpublish_failed"
      POST_EDITED = "post.edited"
      POST_EDIT_FAILED = "post.edit_failed"
      POST_APPROVAL_REQUESTED = "post.approval_requested"
      POST_APPROVED = "post.approved"
      POST_CHANGES_REQUESTED = "post.changes_requested"
      CHANNEL_CONNECTED = "channel.connected"
      CHANNEL_DISCONNECTED = "channel.disconnected"
      CHANNEL_RECONNECT_NEEDED = "channel.reconnect_needed"
      CHANNEL_DISABLED = "channel.disabled"
      CHANNEL_ENABLED = "channel.enabled"
      CHANNEL_EXPIRING = "channel.expiring"
      MEDIA_READY = "media.ready"
      MEDIA_FAILED = "media.failed"
      COMMENT_RECEIVED = "comment.received"
      COMMENT_REPLIED = "comment.replied"
      REVIEW_RECEIVED = "review.received"
      REVIEW_REPLIED = "review.replied"
      MESSAGE_RECEIVED = "message.received"
      MESSAGE_SENT = "message.sent"
      BOOST_STARTED = "boost.started"
      BOOST_PAUSED = "boost.paused"
      BOOST_RESUMED = "boost.resumed"
      BOOST_STOPPED = "boost.stopped"
      BOOST_ENDED = "boost.ended"
      BOOST_FAILED = "boost.failed"
      BOOST_UNCONFIRMED = "boost.unconfirmed"
      BOOST_BUDGET_REACHED = "boost.budget_reached"
    end
  end
end
