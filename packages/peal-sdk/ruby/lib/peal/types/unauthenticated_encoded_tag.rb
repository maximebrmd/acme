# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module UnauthenticatedEncodedTag
      extend Peal::Internal::Types::Enum

      UNAUTHENTICATED = "Unauthenticated"
    end
  end
end
