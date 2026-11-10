# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module HostedConnectFailure
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
      LINK_EXPIRED = "linkExpired"
      LINK_COMPLETED = "linkCompleted"
      LINK_REVOKED = "linkRevoked"
      TOO_MANY_ATTEMPTS = "tooManyAttempts"
      PLAN_LIMIT = "planLimit"
      CHANNEL_GONE = "channelGone"
      PLATFORM_UNREACHABLE = "platformUnreachable"
    end
  end
end
