# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module InboxActionUnavailableEncodedStanding
      extend Peal::Internal::Types::Enum

      RECONNECT = "reconnect"
      UNSUPPORTED = "unsupported"
    end
  end
end
