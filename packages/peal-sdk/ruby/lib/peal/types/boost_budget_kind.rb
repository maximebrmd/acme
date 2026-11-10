# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module BoostBudgetKind
      extend Peal::Internal::Types::Enum

      TOTAL = "total"
      DAILY = "daily"
    end
  end
end
