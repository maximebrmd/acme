# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module FollowUpKind
      extend Peal::Internal::Types::Enum

      COMMENT = "comment"
      REPOST = "repost"
    end
  end
end
