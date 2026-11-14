# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class RateCardX < Internal::Types::Model
      field :default_ceiling, -> { Integer }, optional: false, nullable: false, api_name: "defaultCeiling"

      field :rates, -> { Peal::Types::RateCardXRates }, optional: false, nullable: false

      field :rates_read_on, -> { String }, optional: false, nullable: false, api_name: "ratesReadOn"
    end
  end
end
