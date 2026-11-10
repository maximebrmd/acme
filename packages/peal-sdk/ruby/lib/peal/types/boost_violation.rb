# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module BoostViolation
      extend Peal::Internal::Types::Enum

      CURRENCY_MISMATCH = "currencyMismatch"
      BUDGET_EMPTY = "budgetEmpty"
      ENDS_BEFORE_START = "endsBeforeStart"
      RUN_TOO_SHORT = "runTooShort"
      RUN_TOO_LONG = "runTooLong"
      STARTS_TOO_FAR_AHEAD = "startsTooFarAhead"
      AGE_RANGE = "ageRange"
      SPECIAL_CATEGORY = "specialCategory"
      BENEFICIARY_REQUIRED = "beneficiaryRequired"
    end
  end
end
