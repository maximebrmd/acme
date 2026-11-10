# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PostWarningChannelsDropped < Internal::Types::Model
      field :channel_ids, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "channelIds"

      field :channel_set_id, -> { String }, optional: false, nullable: false, api_name: "channelSetId"

      field :channel_set_name, -> { String }, optional: false, nullable: false, api_name: "channelSetName"
    end
  end
end
