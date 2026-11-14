# frozen_string_literal: true

require_relative "../../../peal"

module Peal
  module Channels
    module Types
      module ReconnectChannelsRequestMessages
        extend Peal::Internal::Types::Enum

        TRUE = "true"
        FALSE = "false"
      end
    end
  end
end
