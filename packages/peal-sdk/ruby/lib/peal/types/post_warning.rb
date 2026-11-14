# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PostWarning < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::PostWarningChannelsDropped }, key: "CHANNELS_DROPPED"

      member -> { Peal::Types::PostWarningQueueChannelsDropped }, key: "QUEUE_CHANNELS_DROPPED"

      member -> { Peal::Types::PostWarningXNotBilled }, key: "X_NOT_BILLED"
    end
  end
end
