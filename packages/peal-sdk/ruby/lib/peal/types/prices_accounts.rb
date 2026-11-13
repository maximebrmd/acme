# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PricesAccounts < Internal::Types::Model
      field :bands, -> { Internal::Types::Array[Peal::Types::AccountBand] }, optional: false, nullable: false
    end
  end
end
