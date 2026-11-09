# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module PaidPlan
      extend Peal::Internal::Types::Enum

      STARTER = "starter"
      PRO = "pro"
      BUSINESS = "business"
      AGENCY = "agency"
    end
  end
end
