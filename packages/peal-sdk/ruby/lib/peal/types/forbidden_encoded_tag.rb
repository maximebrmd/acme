# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module ForbiddenEncodedTag
      extend Peal::Internal::Types::Enum

      FORBIDDEN = "Forbidden"
    end
  end
end
