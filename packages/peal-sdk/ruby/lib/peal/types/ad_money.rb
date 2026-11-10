# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AdMoney < Internal::Types::Model
      field :amount, -> { Integer }, optional: false, nullable: false

      field :currency, -> { String }, optional: false, nullable: false
    end
  end
end
