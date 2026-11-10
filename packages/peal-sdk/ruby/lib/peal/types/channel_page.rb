# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ChannelPage < Internal::Types::Model
      field :counts, -> { Peal::Types::ChannelPageCounts }, optional: false, nullable: false

      field :items, -> { Internal::Types::Array[Peal::Types::Channel] }, optional: false, nullable: false

      field :next_cursor, -> { String }, optional: false, nullable: true, api_name: "nextCursor"
    end
  end
end
