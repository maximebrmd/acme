# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module ChannelCannotPostEncodedTag
      extend Peal::Internal::Types::Enum

      CHANNEL_CANNOT_POST = "ChannelCannotPost"
    end
  end
end
