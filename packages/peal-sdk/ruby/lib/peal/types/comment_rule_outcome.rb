# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module CommentRuleOutcome
      extend Peal::Internal::Types::Enum

      CLAIMED = "claimed"
      REPLIED = "replied"
      SAME_PERSON = "samePerson"
      REFUSED = "refused"
    end
  end
end
