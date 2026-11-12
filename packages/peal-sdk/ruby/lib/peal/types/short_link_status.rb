# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ShortLinkStatus < Internal::Types::Model
      field :available, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :base, -> { String }, optional: false, nullable: true

      field :by_default, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "byDefault"

      field :short_length, -> { Integer }, optional: false, nullable: true, api_name: "shortLength"
    end
  end
end
