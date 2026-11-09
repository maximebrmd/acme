# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module ConnectFailedEncodedTag
      extend Peal::Internal::Types::Enum

      CONNECT_FAILED = "ConnectFailed"
    end
  end
end
