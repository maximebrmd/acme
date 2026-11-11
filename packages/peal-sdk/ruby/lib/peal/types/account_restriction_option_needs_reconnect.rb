# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AccountRestrictionOptionNeedsReconnect < Internal::Types::Model
      field :field, -> { String }, optional: false, nullable: false
    end
  end
end
