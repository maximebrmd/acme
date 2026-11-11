# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module QueueNoRoom
      extend Peal::Internal::Types::Enum

      NO_SLOTS = "noSlots"
      FULL = "full"
    end
  end
end
