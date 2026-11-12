# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module FeedStatus
      extend Peal::Internal::Types::Enum

      ACTIVE = "active"
      PAUSED = "paused"
      STOPPED = "stopped"
    end
  end
end
