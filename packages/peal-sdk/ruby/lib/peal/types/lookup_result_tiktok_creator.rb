# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class LookupResultTiktokCreator < Internal::Types::Model
      field :items, -> { Internal::Types::Array[Peal::Types::TikTokAccount] }, optional: false, nullable: false

      field :next_cursor, -> { String }, optional: false, nullable: true, api_name: "nextCursor"
    end
  end
end
