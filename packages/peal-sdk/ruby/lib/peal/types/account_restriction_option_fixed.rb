# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AccountRestrictionOptionFixed < Internal::Types::Model
      field :field, -> { String }, optional: false, nullable: false

      field :value, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
