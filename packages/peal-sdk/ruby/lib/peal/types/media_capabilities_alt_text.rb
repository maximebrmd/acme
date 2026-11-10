# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class MediaCapabilitiesAltText < Internal::Types::Model
      field :max_length, -> { Integer }, optional: false, nullable: false, api_name: "maxLength"

      field :shown, -> { Internal::Types::Boolean }, optional: false, nullable: true
    end
  end
end
