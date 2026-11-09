# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module ChannelCannotPostEncodedReason
      extend Peal::Internal::Types::Enum

      DISABLED = "disabled"
      RECONNECT = "reconnect"
    end
  end
end
