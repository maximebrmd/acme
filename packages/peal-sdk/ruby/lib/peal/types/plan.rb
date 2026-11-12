# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module Plan
      extend Peal::Internal::Types::Enum

      FREE = "free"
      STARTER = "starter"
      PRO = "pro"
      BUSINESS = "business"
      AGENCY = "agency"
      PAY_AS_YOU_GO = "payAsYouGo"
    end
  end
end
