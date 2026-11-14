# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module FollowUpEndReason
      extend Peal::Internal::Types::Enum

      STOPPED = "stopped"
      COMPLETED = "completed"
      STARTER_GONE = "starterGone"
    end
  end
end
