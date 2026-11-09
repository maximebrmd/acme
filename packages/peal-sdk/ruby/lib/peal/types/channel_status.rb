# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ChannelStatus < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::ChannelStatusActive }, key: "ACTIVE"

      member -> { Peal::Types::ChannelStatusRefreshNeeded }, key: "REFRESH_NEEDED"

      member -> { Peal::Types::ChannelStatusDisabled }, key: "DISABLED"
    end
  end
end
