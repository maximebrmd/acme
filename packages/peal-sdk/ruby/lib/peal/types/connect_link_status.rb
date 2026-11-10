# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module ConnectLinkStatus
      extend Peal::Internal::Types::Enum

      PENDING = "pending"
      COMPLETED = "completed"
      REVOKED = "revoked"
      EXPIRED = "expired"
    end
  end
end
