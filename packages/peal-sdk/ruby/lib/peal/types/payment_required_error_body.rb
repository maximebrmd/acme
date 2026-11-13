# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PaymentRequiredErrorBody < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::UsageAllowanceReachedEncoded }, key: "USAGE_ALLOWANCE_REACHED"

      member -> { Peal::Types::PlanLimitReachedEncoded }, key: "PLAN_LIMIT_REACHED"
    end
  end
end
