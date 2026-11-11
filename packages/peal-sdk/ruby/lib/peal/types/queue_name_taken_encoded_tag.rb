# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module QueueNameTakenEncodedTag
      extend Peal::Internal::Types::Enum

      QUEUE_NAME_TAKEN = "QueueNameTaken"
    end
  end
end
