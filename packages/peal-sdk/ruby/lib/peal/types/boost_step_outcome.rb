# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module BoostStepOutcome
      extend Peal::Internal::Types::Enum

      DONE = "done"
      REFUSED = "refused"
      FOUND = "found"
      ABSENT = "absent"
      UNKNOWN = "unknown"
    end
  end
end
