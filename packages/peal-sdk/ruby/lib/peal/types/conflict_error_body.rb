# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ConflictErrorBody < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::PostNotRecyclableEncoded }, key: "POST_NOT_RECYCLABLE"

      member -> { Peal::Types::RecyclingRuleEndedEncoded }, key: "RECYCLING_RULE_ENDED"

      member -> { Peal::Types::TooManyRecyclingRulesEncoded }, key: "TOO_MANY_RECYCLING_RULES"
    end
  end
end
