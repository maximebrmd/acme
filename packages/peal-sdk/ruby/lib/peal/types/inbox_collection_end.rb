# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module InboxCollectionEnd
      extend Peal::Internal::Types::Enum

      WINDOW = "window"
      DISCONNECTED = "disconnected"
      UNSUPPORTED = "unsupported"
      MISSING = "missing"
      REMOVED = "removed"
    end
  end
end
