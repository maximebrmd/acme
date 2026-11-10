# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module BoostFailureReason
      extend Peal::Internal::Types::Enum

      ACCOUNT_UNUSABLE = "accountUnusable"
      ACCOUNT_SPEND_CAP = "accountSpendCap"
      CEILING_EXCEEDED = "ceilingExceeded"
      SPENDING_OFF = "spendingOff"
      CURRENCY_MISMATCH = "currencyMismatch"
      BUDGET_TOO_LOW = "budgetTooLow"
      POST_NOT_PROMOTABLE = "postNotPromotable"
      PERMISSION_MISSING = "permissionMissing"
      RECONNECT_NEEDED = "reconnectNeeded"
      NETWORK_UNAVAILABLE = "networkUnavailable"
      REFUSED = "refused"
      SPENDING_UNAVAILABLE = "spendingUnavailable"
    end
  end
end
