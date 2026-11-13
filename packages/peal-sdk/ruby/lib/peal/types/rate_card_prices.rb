# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class RateCardPrices < Internal::Types::Model
      field :usd, -> { Peal::Types::Prices }, optional: false, nullable: false
    end
  end
end
