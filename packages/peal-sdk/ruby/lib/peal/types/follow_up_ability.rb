# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module FollowUpAbility
      extend Peal::Internal::Types::Enum

      AVAILABLE = "available"
      NOT_ASKED = "notAsked"
      NO_API = "noApi"
      REVIEW = "review"
      NOT_BUILT = "notBuilt"
      NOT_ALLOWED = "notAllowed"
      TURNED_OFF = "turnedOff"
      RECONNECT = "reconnect"
      NOT_COUNTED = "notCounted"
      TEXT_TOO_LONG = "textTooLong"
    end
  end
end
