# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module InboxAbilityStanding
      extend Peal::Internal::Types::Enum

      AVAILABLE = "available"
      RECONNECT = "reconnect"
      UNSUPPORTED = "unsupported"
    end
  end
end
