# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ConflictErrorBody < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::FollowUpRuleTakenEncoded }, key: "FOLLOW_UP_RULE_TAKEN"

      member -> { Peal::Types::TooManyFollowUpRulesEncoded }, key: "TOO_MANY_FOLLOW_UP_RULES"
    end
  end
end
