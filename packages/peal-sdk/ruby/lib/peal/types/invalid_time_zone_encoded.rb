# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class InvalidTimeZoneEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::InvalidTimeZoneEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :time_zone, -> { String }, optional: false, nullable: false, api_name: "timeZone"
    end
  end
end
