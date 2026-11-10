# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    # Who a boost is shown to: people in some countries (ISO 3166-1 alpha-2 codes in capitals, 25 at most), between two
    # ages (18 to 65, 65 meaning "65 and over"). Nothing finer.
    class BoostAudience < Internal::Types::Model
      field :age_max, -> { Integer }, optional: false, nullable: false, api_name: "ageMax"

      field :age_min, -> { Integer }, optional: false, nullable: false, api_name: "ageMin"

      field :countries, -> { Internal::Types::Array[String] }, optional: false, nullable: false
    end
  end
end
