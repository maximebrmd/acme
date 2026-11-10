# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module ChannelStatusName
      extend Peal::Internal::Types::Enum

      ACTIVE = "active"
      REFRESH_NEEDED = "refreshNeeded"
      DISABLED = "disabled"
    end
  end
end
