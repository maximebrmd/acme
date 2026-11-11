# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class QueueDetails < Internal::Types::Model
      field :channel_ids, -> { Internal::Types::Array[String] }, optional: true, nullable: false, api_name: "channelIds"

      field :channel_set_id, -> { String }, optional: true, nullable: false, api_name: "channelSetId"

      field :is_default, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "isDefault"

      field :name, -> { String }, optional: false, nullable: false

      field :slots, -> { Internal::Types::Array[Peal::Types::QueueSlot] }, optional: false, nullable: false

      field :time_zone, -> { String }, optional: false, nullable: false, api_name: "timeZone"
    end
  end
end
