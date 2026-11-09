# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module PaidPlan
      extend Peal::Internal::Types::Enum

      PRO = "pro"
      BUSINESS = "business"
    end
  end
end
