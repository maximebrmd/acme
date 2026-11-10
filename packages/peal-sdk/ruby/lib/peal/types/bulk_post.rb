# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class BulkPost < Internal::Types::Model
      field :allow_duplicate, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "allowDuplicate"

      field :channel_ids, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "channelIds"

      field :content, -> { Peal::Types::PostContent }, optional: false, nullable: false

      field :options, -> { Internal::Types::Array[Peal::Types::ChannelOptions] }, optional: true, nullable: false

      field :when_, -> { Peal::Types::PostTiming }, optional: false, nullable: false, api_name: "when"

      field :idempotency_key, -> { String }, optional: true, nullable: false, api_name: "idempotencyKey"
    end
  end
end
