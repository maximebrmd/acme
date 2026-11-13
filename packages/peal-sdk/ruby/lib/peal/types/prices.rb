# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class Prices < Internal::Types::Model
      field :accounts, -> { Peal::Types::PricesAccounts }, optional: false, nullable: false

      field :meters, -> { Peal::Types::PricesMeters }, optional: false, nullable: false
    end
  end
end
