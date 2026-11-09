# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module BillingInterval
      extend Peal::Internal::Types::Enum

      MONTH = "month"
      YEAR = "year"
    end
  end
end
