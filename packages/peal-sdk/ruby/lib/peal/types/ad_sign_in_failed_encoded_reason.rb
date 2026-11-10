# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module AdSignInFailedEncodedReason
      extend Peal::Internal::Types::Enum

      DENIED = "denied"
      EXPIRED = "expired"
      FAILED = "failed"
      NOT_CONFIGURED = "notConfigured"
    end
  end
end
