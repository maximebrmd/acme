# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module ConnectFailureReason
      extend Peal::Internal::Types::Enum

      PLATFORM_NOT_SUPPORTED = "platformNotSupported"
      NOT_CONFIGURED = "notConfigured"
      INVALID_INSTANCE = "invalidInstance"
      INSTANCE_NOT_ALLOWED = "instanceNotAllowed"
      INVALID_HANDLE = "invalidHandle"
      INVALID_STATE = "invalidState"
      DENIED = "denied"
      AUTHORIZATION_FAILED = "authorizationFailed"
      ACCOUNT_MISMATCH = "accountMismatch"
      NO_ACCOUNTS = "noAccounts"
    end
  end
end
