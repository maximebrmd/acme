# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module MediaTooLargeEncodedKind
      extend Peal::Internal::Types::Enum

      IMAGE = "image"
      VIDEO = "video"
    end
  end
end
