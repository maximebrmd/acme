# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module BoostState
      extend Peal::Internal::Types::Enum

      REQUESTED = "requested"
      ACTIVE = "active"
      PAUSED = "paused"
      ENDED = "ended"
      STOPPED = "stopped"
      FAILED = "failed"
      UNCONFIRMED = "unconfirmed"
    end
  end
end
