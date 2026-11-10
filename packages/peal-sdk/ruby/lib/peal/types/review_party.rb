# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module ReviewParty
      extend Peal::Internal::Types::Enum

      MEMBER = "member"
      VISITOR = "visitor"
      APPLICATION = "application"
    end
  end
end
