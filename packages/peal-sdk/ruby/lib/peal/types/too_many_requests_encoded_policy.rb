# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module TooManyRequestsEncodedPolicy
      extend Peal::Internal::Types::Enum

      DEFAULT = "default"
      FREE = "free"
      OVERRIDE = "override"
    end
  end
end
