# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module AdAccess
      extend Peal::Internal::Types::Enum

      WORKING = "working"
      RECONNECT_NEEDED = "reconnectNeeded"
    end
  end
end
