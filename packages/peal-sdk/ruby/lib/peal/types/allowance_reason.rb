# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module AllowanceReason
      extend Peal::Internal::Types::Enum

      PAYMENT_METHOD_REQUIRED = "paymentMethodRequired"
      CEILING_REACHED = "ceilingReached"
      NOT_ENABLED = "notEnabled"
    end
  end
end
