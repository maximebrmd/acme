# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class BoostPage < Internal::Types::Model
      field :boosts, -> { Internal::Types::Array[Peal::Types::Boost] }, optional: false, nullable: false

      field :next_cursor, -> { String }, optional: false, nullable: true, api_name: "nextCursor"
    end
  end
end
