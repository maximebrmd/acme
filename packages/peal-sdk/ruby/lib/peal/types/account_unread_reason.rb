# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module AccountUnreadReason
      extend Peal::Internal::Types::Enum

      DISABLED = "disabled"
      DISCONNECTED = "disconnected"
      PLATFORM_UNREACHABLE = "platformUnreachable"
      RATE_LIMITED = "rateLimited"
      RECONNECT = "reconnect"
    end
  end
end
