# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class UnknownChannelsEncoded < Internal::Types::Model
      field :channel_ids, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "channelIds"
    end
  end
end
