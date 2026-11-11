# frozen_string_literal: true

require_relative "../../../peal"

module Peal
  module NotificationPreferences
    module Types
      class NotificationPreferencesChangeEmail < Internal::Types::Model
        field :channel_reconnect, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "channelReconnect"

        field :comments, -> { Internal::Types::Boolean }, optional: true, nullable: false

        field :post_failed, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "postFailed"

        field :post_published, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "postPublished"

        field :post_review, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "postReview"

        field :post_unconfirmed, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "postUnconfirmed"

        field :webhook_failing, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "webhookFailing"
      end
    end
  end
end
