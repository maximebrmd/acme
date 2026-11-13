# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class RateCard < Internal::Types::Model
      field :api_requests_per_minute, -> { Peal::Types::RateCardAPIRequestsPerMinute }, optional: false, nullable: false, api_name: "apiRequestsPerMinute"

      field :assistant, -> { Peal::Types::RateCardAssistant }, optional: false, nullable: false

      field :days_per_month, -> { Integer }, optional: false, nullable: false, api_name: "daysPerMonth"

      field :display_vat_rate, -> { Integer }, optional: false, nullable: false, api_name: "displayVatRate"

      field :meters, -> { Peal::Types::RateCardMeters }, optional: false, nullable: false

      field :prices, -> { Peal::Types::RateCardPrices }, optional: false, nullable: false

      field :storage, -> { Peal::Types::RateCardStorage }, optional: false, nullable: false

      field :unverified_ceiling, -> { Integer }, optional: false, nullable: false, api_name: "unverifiedCeiling"

      field :x, -> { Peal::Types::RateCardX }, optional: false, nullable: false
    end
  end
end
