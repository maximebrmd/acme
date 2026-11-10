# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class BoostQuote < Internal::Types::Model
      field :cap_room, -> { Integer }, optional: false, nullable: true, api_name: "capRoom"

      field :ceiling, -> { Integer }, optional: false, nullable: false

      field :commitment, -> { Integer }, optional: false, nullable: false

      field :committed, -> { Integer }, optional: false, nullable: false

      field :currency, -> { String }, optional: false, nullable: false

      field :days, -> { Integer }, optional: false, nullable: false

      field :ends_at, -> { String }, optional: false, nullable: false, api_name: "endsAt"

      field :minor_unit_digits, -> { Float }, optional: false, nullable: false, api_name: "minorUnitDigits"

      field :starts_at, -> { String }, optional: false, nullable: false, api_name: "startsAt"
    end
  end
end
