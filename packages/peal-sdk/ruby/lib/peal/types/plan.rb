# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module Plan
      extend Peal::Internal::Types::Enum

      FREE = "free"
      PRO = "pro"
      BUSINESS = "business"
    end
  end
end
