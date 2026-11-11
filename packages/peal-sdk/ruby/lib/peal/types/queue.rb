# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class Queue < Internal::Types::Model
      field :channel_ids, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "channelIds"

      field :channel_set_id, -> { String }, optional: false, nullable: true, api_name: "channelSetId"

      field :created_at, -> { String }, optional: false, nullable: false, api_name: "createdAt"

      field :id, -> { String }, optional: false, nullable: false

      field :is_default, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "isDefault"

      field :name, -> { String }, optional: false, nullable: false

      field :slots, -> { Internal::Types::Array[Peal::Types::QueueSlot] }, optional: false, nullable: false

      field :time_zone, -> { String }, optional: false, nullable: false, api_name: "timeZone"

      field :unavailable_channel_ids, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "unavailableChannelIds"
    end
  end
end
