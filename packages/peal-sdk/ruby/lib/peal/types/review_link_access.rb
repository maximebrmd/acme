# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module ReviewLinkAccess
      extend Peal::Internal::Types::Enum

      VIEW = "view"
      COMMENT = "comment"
      APPROVE = "approve"
    end
  end
end
