# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module CommentRuleAbility
      extend Peal::Internal::Types::Enum

      AVAILABLE = "available"
      NO_API = "noApi"
      NOT_ALLOWED = "notAllowed"
      UNSUPPORTED = "unsupported"
      RECONNECT = "reconnect"
      TEXT_TOO_LONG = "textTooLong"
    end
  end
end
