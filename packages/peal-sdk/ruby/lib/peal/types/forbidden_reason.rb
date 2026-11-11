# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module ForbiddenReason
      extend Peal::Internal::Types::Enum

      MISSING_SCOPE = "missingScope"
      MISSING_PERMISSION = "missingPermission"
      PERSON_REQUIRED = "personRequired"
      WRONG_WORKSPACE = "wrongWorkspace"
      SUSPENDED = "suspended"
      UNTRUSTED_ORIGIN = "untrustedOrigin"
      TWO_STEP_REQUIRED = "twoStepRequired"
    end
  end
end
