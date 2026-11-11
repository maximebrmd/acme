# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module QueueHasNoRoomEncodedTag
      extend Peal::Internal::Types::Enum

      QUEUE_HAS_NO_ROOM = "QueueHasNoRoom"
    end
  end
end
