# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module ReviewLinkStatus
      extend Peal::Internal::Types::Enum

      ACTIVE = "active"
      EXPIRED = "expired"
      REVOKED = "revoked"
    end
  end
end
