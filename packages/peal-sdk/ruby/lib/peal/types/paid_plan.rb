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
      PAY_AS_YOU_GO = "payAsYouGo"
    end
  end
end
