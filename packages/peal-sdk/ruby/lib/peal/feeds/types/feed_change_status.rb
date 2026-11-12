# frozen_string_literal: true

require_relative "../../../peal"

module Peal
  module Feeds
    module Types
      module FeedChangeStatus
        extend Peal::Internal::Types::Enum

        ACTIVE = "active"
        PAUSED = "paused"
      end
    end
  end
end
