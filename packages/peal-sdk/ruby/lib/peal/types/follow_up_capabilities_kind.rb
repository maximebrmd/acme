# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module FollowUpCapabilitiesKind
      extend Peal::Internal::Types::Enum

      THREAD = "thread"
      COMMENT = "comment"
    end
  end
end
