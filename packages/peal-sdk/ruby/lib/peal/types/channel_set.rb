# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ChannelSet < Internal::Types::Model
      field :channel_ids, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "channelIds"

      field :created_at, -> { String }, optional: false, nullable: false, api_name: "createdAt"

      field :id, -> { String }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false

      field :options, -> { Internal::Types::Array[Peal::Types::ChannelOptions] }, optional: false, nullable: false

      field :unavailable_channel_ids, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "unavailableChannelIds"
    end
  end
end
