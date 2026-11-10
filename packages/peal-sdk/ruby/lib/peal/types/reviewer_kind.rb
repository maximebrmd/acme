# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module ReviewerKind
      extend Peal::Internal::Types::Enum

      MEMBER = "member"
      API_KEY = "apiKey"
      VISITOR = "visitor"
    end
  end
end
