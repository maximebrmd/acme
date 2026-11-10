# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AccountRestrictionOptionValues < Internal::Types::Model
      field :field, -> { String }, optional: false, nullable: false

      field :values, -> { Internal::Types::Array[String] }, optional: false, nullable: false
    end
  end
end
