# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PostPage < Internal::Types::Model
      field :channels, -> { Internal::Types::Array[Peal::Types::PostChannel] }, optional: false, nullable: false

      field :items, -> { Internal::Types::Array[Peal::Types::Post] }, optional: false, nullable: false

      field :next_cursor, -> { String }, optional: false, nullable: true, api_name: "nextCursor"
    end
  end
end
