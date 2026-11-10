# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ChannelSetDetails < Internal::Types::Model
      field :channel_ids, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "channelIds"

      field :name, -> { String }, optional: false, nullable: false

      field :options, -> { Internal::Types::Array[Peal::Types::ChannelOptions] }, optional: true, nullable: false
    end
  end
end
