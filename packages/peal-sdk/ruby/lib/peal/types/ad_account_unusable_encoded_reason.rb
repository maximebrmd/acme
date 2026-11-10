# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module AdAccountUnusableEncodedReason
      extend Peal::Internal::Types::Enum

      STATUS = "status"
      RECONNECT_NEEDED = "reconnectNeeded"
      PERMISSION = "permission"
    end
  end
end
