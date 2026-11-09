# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NotificationPreferencesEmail < Internal::Types::Model
      field :channel_reconnect, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "channelReconnect"

      field :post_failed, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "postFailed"

      field :post_published, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "postPublished"

      field :post_unconfirmed, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "postUnconfirmed"
    end
  end
end
