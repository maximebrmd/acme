# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ShortLinkPage < Internal::Types::Model
      field :items, -> { Internal::Types::Array[Peal::Types::ShortLink] }, optional: false, nullable: false

      field :next_cursor, -> { String }, optional: false, nullable: true, api_name: "nextCursor"

      field :period, -> { Peal::Types::ShortLinkPeriod }, optional: false, nullable: false
    end
  end
end
