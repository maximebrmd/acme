# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ChannelCapabilities < Internal::Types::Model
      field :account, -> { Peal::Types::AccountStanding }, optional: false, nullable: false

      field :capabilities, -> { Peal::Types::PlatformCapabilities }, optional: false, nullable: false

      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"
    end
  end
end
